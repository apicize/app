import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { subtle, randomBytes, createHash, randomInt } from 'crypto'

const client = new DynamoDBClient({maxAttempts: 5});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TOKEN_TIMEOUT_SECS = 600 // 10 min

/*
   Note:  Generate a CIPHER_KEY as follows
     const key = await crypto.subtle.generateKey({name: 'AES-CBC', length: 256},true,['encrypt','decrypt'])
     const cipherKey = Buffer.from(await crypto.subtle.exportKey('raw', key)).toString('base64')
*/

export class FakeTokenManagement {
    constructor() {
        this.keyTableName = process.env['TABLE_NAME_TOKENS']
        this.cipherKeyBase64 = process.env['CIPHER_KEY']
    }

    async getEncryptionKey() {
        if (!this.encryptionKey) {
            this.encryptionKey = await subtle.importKey(
                'raw',
                Buffer.from(this.cipherKeyBase64, 'base64'),
                'AES-CBC',
                true,
                ['encrypt', 'decrypt']
            )
        }
        return this.encryptionKey
    }

    /**
     * Generate a key with the specified scopes, if any
     * @param {String} scopes 
     * @returns 
     */
    async generateToken(scopes) {
        const expiration = Date.now() + TOKEN_TIMEOUT_SECS * 1000

        let rnd = ''
        for(let i = 0; i < 8; i++) rnd = rnd + String.fromCharCode(randomInt(48, 128))

        const tokenInfo = `${rnd}\t${scopes}\t${expiration}`
        const checksum = createHash('md5').update(tokenInfo).digest('hex')
        const token = `${tokenInfo}\t${checksum}`

        const iv = randomBytes(16)
        const cipherText = await subtle.encrypt(
            {
                name: 'AES-CBC',
                iv
            },
            await this.getEncryptionKey(),
            Buffer.from(token)
        )
        const encodedToken = iv.toString('hex') + ',' + Buffer.from(cipherText).toString('base64')

        let params = {
            TableName: this.keyTableName,
            Item: {
                Token: encodedToken,
                TimeToLive: expiration
            }
        };

        await ddbDocClient.send(new PutCommand(params));
        return { 
            access_token: encodedToken, 
            token_type: 'Bearer',
            expires_in: TOKEN_TIMEOUT_SECS - 1,
            scope: scopes
        }
    }

    async validateRequest(event, requiredScope) {
        let auth = Object.entries(event.headers).find(([name, _]) => name.toLowerCase() === 'authorization')?.[1] ?? ''
        if (auth.length === 0) {
            throw new Error('Missing authorization header')
        }

        if (! auth.startsWith('Bearer ')) {
            throw new Error('Authorization header is not a bearer token')
        }

        const encodedToken = auth.substring(7)

        let params = {
            TableName: this.keyTableName,
            Key: {
                Token: encodedToken
            }
        };

        try {
            const result = await ddbDocClient.send(new GetCommand(params))
            if (!result.Item) {
                throw new Error('Invalid token')
            }
            if (Date.now() > result.Item.TimeToLive) {
                throw new Error('Token is expired')
            }

            await this.validateToken(encodedToken, result.Item.TimeToLive, requiredScope)
            return encodedToken
        } catch (e) {
            throw new Error(`!!!! Unable to validate token - ${e}`)
        }
    }

    async validateToken(encodedToken, storedExpiration, requiredScope) {
        const cipherParts = encodedToken.split(',')
        if (cipherParts.length !== 2) {
            throw new Error('Invalid token data')
        }

        const iv = Buffer.from(cipherParts[0], 'hex')
        const cipherText = Buffer.from(cipherParts[1], 'base64')
        const decipher = await subtle.decrypt(
            {
                name: 'AES-CBC',
                iv
            },
            await this.getEncryptionKey(),
            cipherText)

        const parts = Buffer.from(decipher).toString().split('\t')
        if (parts.length != 4) {
            throw new Error('Invalid token')
        }

        const checksum = createHash('md5').update(parts.slice(0, 3).join('\t')).digest('hex')
        if (checksum !== parts[3]) {
            throw new Error('Corrupted token')
        }

        const expiration = parseInt(parts[2])
        if (expiration !== storedExpiration) {
            throw new Error('Token expiration mismatch')
        }

        if (requiredScope) {
            const scopes = parts[1].split(' ')
            if (! scopes.includes(requiredScope)) {
                throw new Error(`Token does not include "${requiredScope}" scope (${scopes.join(', ')})`)
            }
        }

        if (Date.now() > expiration) {
            throw new Error('Expired token')
        }
    }
}
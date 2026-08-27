import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto'
import { FakeTokenManagement } from '../token/token.mjs'
const tokenManagment = new FakeTokenManagement()

const client = new DynamoDBClient({});

const regexMath = /^[ \.\d\+\-\*\/\(\)]+$/;

/**
 * Parse and validate text
 * @param {*} data 
 */
const parseText = (data, allowJson) => {
    let parsed

    if (allowJson) {
        try {
            parsed = JSON.parse(data)
            if (Array.isArray(parsed)) {
                parsed = parsed.map((p, idx) =>
                    parseText(p, allowJson)
                )
                parsed = parsed.join('')
            }
        } catch {
            parsed = data
        }
    } else {
        parsed = data
    }

    // Dumb check for valid characters
    if (!regexMath.test(parsed)) {
        throw new Error('Characters must be 0-9 + - * / ( )')
    }

    if (typeof parsed === 'number') {
        parsed = `+${parsed}`
    } else if (typeof (parsed) === 'string') {
        if (data.length === 0) {
            throw new Error('No data submitted')
        }
        if (!['+', '-', '*', '/'].includes(parsed[0])) {
            parsed = `+${parsed}`
        }
    }

    return parsed

}


export const calcHandler = async (event) => {
    let key
    try {
        key = await tokenManagment.validateRequest(event, 'calc')
    } catch (e) {
        return {
            statusCode: 403,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `${e}`
            })
        }
    }

    try {
        let contentType = Object.entries(event.headers).find(([name, _]) => name.toLowerCase() === 'content-type')?.[1] ?? ''
        const processAsJson = contentType.includes('json')

        let parsed = parseText(Buffer.from(event.body, 'base64').toString('utf-8'), processAsJson)
        const result = (0, eval)(parsed)
        if (!Number.isFinite(result)) {
            throw new Error('Divide by zero')
        }
        if (result === Number.NaN) {
            throw new Error('Non-numeric result')
        }

        if (processAsJson) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    result
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        } else {
            return {
                statusCode: 200,
                body: result,
                headers: {
                    'Content-Type': 'document/text'
                }
            }
        }
    } catch (e) {
        return {
            statusCode: 400,
            body: `${e}`,
            headers: {
                'Content-Type': 'document/text'
            }
        }
    }
}

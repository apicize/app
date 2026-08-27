import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto'
import { FakeTokenManagement } from '../token/token.mjs'
const tokenManagment = new FakeTokenManagement()

const quotesTableName = process.env.TABLE_NAME_QUOTES ?? 'apicize-sample-quotes';

const client = new DynamoDBClient({maxAttempts: 5});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const getQuote = async (token, id) => {
    const result = await ddbDocClient.send(new GetCommand({
        TableName: quotesTableName,
        Key: {
            Token: token,
            ID: id
        }
    }))
    return result.Item
}

const createQuote = async (token, author, quote) => {
    if ((author?.length ?? 0) === 0) {
        throw new Error('author is required')
    }
    if ((quote?.length ?? 0) === 0) {
        throw new Error('quote is required')
    }

    const id = randomUUID()
    await ddbDocClient.send(new PutCommand({
        TableName: quotesTableName,
        Item: {
            Token: token,
            ID: id,
            TimeToLive: Date.now() + 900000, // (15 min)
            author: author,
            quote: quote
        }
    }));
    return id
}

const updateQuote = async (token, id, author, quote) => {
    let expressions = []
    let values = {
        ':id': id
    }
    if ((author?.length ?? 0) > 0) {
        expressions.push('author=:author')
        values[':author'] = author
    }
    if ((quote?.length ?? 0) > 0) {
        expressions.push('quote=:quote')
        values[':quote'] = quote
    }
    if (expressions.length === 0) {
        throw new Error('Neither author nor quote were specified to update')
    }
    await ddbDocClient.send(new UpdateCommand({
        TableName: quotesTableName,
        Key: {
            Token: token,
            ID: id
        },
        ConditionExpression: 'ID=:id',
        UpdateExpression: `set ${expressions.join(', ')}`,
        ExpressionAttributeValues: values
    }))
}

const deleteQuote = async (token, id) => {
    await ddbDocClient.send(new DeleteCommand({
        TableName: quotesTableName,
        Key: {
            Token: token,
            ID: id,
        },
        ConditionExpression: 'ID = :id',
        ExpressionAttributeValues: {
            ':id': id
        }
    }));
}

export const quotesHandler = async (event) => {
    let key
    try {
        key = await tokenManagment.validateRequest(event, 'quote')
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
        let resultPayload
        if (event.httpMethod === 'GET' && event.resource === '/quote/{id}') {
            resultPayload = await getQuote(key, event.pathParameters.id)
            if (!resultPayload) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Not found' }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            }
        } else if (event.httpMethod === 'POST' && event.resource === '/quote') {
            let newData = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
            resultPayload = { id: await createQuote(key, newData.author, newData.quote) }
        } else if (event.httpMethod === 'PUT' && event.resource === '/quote/{id}') {
            let updatedData = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
            await updateQuote(key, event.pathParameters.id, updatedData.author, updatedData.quote)
            resultPayload = { success: true }
        } else if (event.httpMethod === 'DELETE' && event.resource === '/quote/{id}') {
            resultPayload = await deleteQuote(key, event.pathParameters.id)
            resultPayload = { success: true }
        } else {
            throw new Error('Invalid route')
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resultPayload),
        }
    } catch (e) {
        if (e instanceof ConditionalCheckFailedException) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Quote not found'
                })
            }
        } else {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `${e}`
                })
            }
        }
    }
}

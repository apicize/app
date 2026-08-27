import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { buildSchema, graphql } from 'graphql';
import { FakeTokenManagement } from '../token/token.mjs';

const tokenManagement = new FakeTokenManagement();
const quotesTableName = process.env.TABLE_NAME_QUOTES ?? 'apicize-sample-quotes';

const client = new DynamoDBClient({ maxAttempts: 5 });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const getQuote = async (token, id) => {
    const result = await ddbDocClient.send(new GetCommand({
        TableName: quotesTableName,
        Key: { Token: token, ID: id }
    }));
    return result.Item ?? null;
};

const createQuote = async (token, author, quote) => {
    if ((author?.length ?? 0) === 0) throw new Error('author is required');
    if ((quote?.length ?? 0) === 0) throw new Error('quote is required');
    const id = randomUUID();
    await ddbDocClient.send(new PutCommand({
        TableName: quotesTableName,
        Item: {
            Token: token,
            ID: id,
            TimeToLive: Date.now() + 900000,
            author,
            quote
        }
    }));
    return id;
};

const updateQuote = async (token, id, author, quote) => {
    let expressions = [];
    let values = { ':id': id };
    if ((author?.length ?? 0) > 0) {
        expressions.push('author=:author');
        values[':author'] = author;
    }
    if ((quote?.length ?? 0) > 0) {
        expressions.push('quote=:quote');
        values[':quote'] = quote;
    }
    if (expressions.length === 0) throw new Error('Neither author nor quote were specified to update');
    await ddbDocClient.send(new UpdateCommand({
        TableName: quotesTableName,
        Key: { Token: token, ID: id },
        ConditionExpression: 'ID=:id',
        UpdateExpression: `set ${expressions.join(', ')}`,
        ExpressionAttributeValues: values
    }));
};

const deleteQuote = async (token, id) => {
    await ddbDocClient.send(new DeleteCommand({
        TableName: quotesTableName,
        Key: { Token: token, ID: id },
        ConditionExpression: 'ID = :id',
        ExpressionAttributeValues: { ':id': id }
    }));
};

const schema = buildSchema(`
    type Quote {
        ID: String!
        author: String!
        quote: String!
    }
    type CreateResult {
        id: String!
    }
    type MutationResult {
        success: Boolean!
    }
    type Query {
        getQuote(id: String!): Quote
    }
    type Mutation {
        createQuote(author: String!, quote: String!): CreateResult!
        updateQuote(id: String!, author: String, quote: String): MutationResult!
        deleteQuote(id: String!): MutationResult!
    }
`);

export const quotesGraphQLHandler = async (event) => {
    let key;
    try {
        key = await tokenManagement.validateRequest(event, 'quote');
    } catch (e) {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `${e}` })
        };
    }

    let query, variables;
    try {
        const body = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
        query = body.query;
        variables = body.variables;
    } catch (e) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Invalid request body' })
        };
    }

    const rootValue = {
        getQuote: async ({ id }) => {
            const item = await getQuote(key, id);
            if (!item) throw new Error('Quote not found');
            return item;
        },
        createQuote: async ({ author, quote }) => {
            const id = await createQuote(key, author, quote);
            return { id };
        },
        updateQuote: async ({ id, author, quote }) => {
            try {
                await updateQuote(key, id, author, quote);
            } catch (e) {
                if (e instanceof ConditionalCheckFailedException) throw new Error('Quote not found');
                throw e;
            }
            return { success: true };
        },
        deleteQuote: async ({ id }) => {
            try {
                await deleteQuote(key, id);
            } catch (e) {
                if (e instanceof ConditionalCheckFailedException) throw new Error('Quote not found');
                throw e;
            }
            return { success: true };
        }
    };

    const result = await graphql({ schema, source: query, rootValue, variableValues: variables });
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
};

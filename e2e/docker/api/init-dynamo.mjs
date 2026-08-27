// Creates the DynamoDB tables the sample API expects, matching the schema in
// the SAM template (template.yaml). Safe to run repeatedly; ignores
// ResourceInUseException when a table already exists.

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({})

const TOKENS = process.env.TABLE_NAME_TOKENS ?? 'apicize-sample-tokens'
const QUOTES = process.env.TABLE_NAME_QUOTES ?? 'apicize-sample-quotes'

const tables = [
  {
    TableName: TOKENS,
    AttributeDefinitions: [{ AttributeName: 'Token', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'Token', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: QUOTES,
    AttributeDefinitions: [
      { AttributeName: 'Token', AttributeType: 'S' },
      { AttributeName: 'ID', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'Token', KeyType: 'HASH' },
      { AttributeName: 'ID', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
]

async function waitForDynamo(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await client.send(new DescribeTableCommand({ TableName: '__ping__' }))
      return
    } catch (e) {
      // ResourceNotFoundException means DynamoDB is up but the table is missing - that's fine
      if (e.name === 'ResourceNotFoundException') return
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw new Error('DynamoDB Local did not become available in time')
}

async function main() {
  await waitForDynamo()
  for (const def of tables) {
    try {
      await client.send(new CreateTableCommand(def))
      console.log(`Created table ${def.TableName}`)
    } catch (e) {
      if (e.name === 'ResourceInUseException') {
        console.log(`Table ${def.TableName} already exists`)
      } else {
        throw e
      }
    }
  }
  console.log('DynamoDB initialization complete')
}

main().catch((e) => {
  console.error('Failed to initialize DynamoDB:', e)
  process.exit(1)
})

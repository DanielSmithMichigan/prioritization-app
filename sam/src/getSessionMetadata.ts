import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { authenticate } from './auth.js';
import { headers } from './headers.js';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const tableName = process.env.SESSION_METADATA_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const token = event.headers.Authorization?.split(' ')[1];

    if (!token) {
      return {
        headers,
        statusCode: 403,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const user = await authenticate(token);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const sessionId = event.queryStringParameters?.sessionId;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "sessionId is required" }),
      };
    }

    const result = await ddb.send(new GetCommand({
      TableName: tableName,
      Key: { sessionId },
    }));

    if (!result.Item) {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Session not found" }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Item),
    };
  } catch (err) {
    console.error("Error getting session metadata:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

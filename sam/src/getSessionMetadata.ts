import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const tableName = process.env.SESSION_METADATA_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
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

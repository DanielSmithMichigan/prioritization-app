import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { headers } from './headers.js';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const sessionDataTableName = process.env.SESSION_DATA_TABLE!;
const connectionsTableName = process.env.CONNECTIONS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  try {
    const sessionId = event.queryStringParameters?.sessionId;
    if (!sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "sessionId is required" }) };
    }

    const result = await ddb.send(new QueryCommand({
      TableName: sessionDataTableName,
      KeyConditionExpression: "sessionId = :sid",
      ExpressionAttributeValues: { ":sid": sessionId },
    }));
    if (!result.Items?.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ participants: [] }),
      };
    }

    const participants = await Promise.all(result.Items.map(async(item) => {
      const result = await ddb.send(new GetCommand({
        TableName: connectionsTableName,
        Key: {
          connectionId: item.connectionId
        },
      }));
      return {
        userId: item.userId,
        connectionId: item.connectionId || "(anonymous)",
        ratings: item.ratings || {},
        userName: result.Item?.userName
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ participants }),
    };

  } catch (err) {
    console.error("Error fetching session ratings:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Internal server error" }) };
  }
};

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { authenticate, getTenantId } from './auth.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { headers } from './headers.js';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE!;

export async function getAllStories(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const token = event.headers.Authorization?.split(' ')[1];

  if (!token) {
    return {
      statusCode: 403,
      headers,
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

  const tenantId = getTenantId(user);
  const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 25;
  const nextToken = event.queryStringParameters?.nextToken;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'tenantId = :tid',
    ExpressionAttributeValues: {
      ':tid': tenantId
    },
    Limit: limit,
    ... (nextToken ? { ExclusiveStartKey: JSON.parse(nextToken) } : {})
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stories: result.Items || [],
      nextToken: result.LastEvaluatedKey || null
    }),
  };
}

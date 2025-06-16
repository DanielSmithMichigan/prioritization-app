import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE!;

export async function getAllStories(input: {
  tenantId: string;
  limit?: number;
  nextToken?: any;
}) {
  const { tenantId, limit = 25, nextToken } = input;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'tenantId = :tid',
    ExpressionAttributeValues: {
      ':tid': tenantId
    },
    Limit: limit,
    ... (nextToken ? { ExclusiveStartKey: nextToken } : {})
  }));

  return {
    stories: result.Items || [],
    nextToken: result.LastEvaluatedKey || null
  };
}
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Story } from './types';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE!;

export async function fetchStory(tenantId: string, storyId: string) : Promise<Story> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { tenantId, id: storyId },
  }));

  if (!result.Item) {
    throw new Error("Story not found");
  }

  return result.Item as Story;
}

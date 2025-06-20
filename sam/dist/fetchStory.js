import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE;
export async function fetchStory(tenantId, storyId) {
    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { tenantId, id: storyId },
    }));
    if (!result.Item) {
        throw new Error("Story not found");
    }
    return result.Item;
}

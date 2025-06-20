import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchGetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.STORIES_TABLE!;
const rawClient = new DynamoDBClient({});
const client = DynamoDBDocumentClient.from(rawClient);

type updateMetrics = "impact" | "estimatedTime" | "risk" | "visibility";

type UpdatePayload = {
  metric: updateMetrics;
  updates: { storyId: string; newRating: number }[];
};

interface EloRating {
  rating: number;
  uncertainty: number;
  history?: number[];
}

interface StoryItem {
  id: string;
  tenantId: string;
  elo: Record<updateMetrics, EloRating>;
  [key: string]: any;
}

const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export const batchUpdateRatings = async (event: UpdatePayload) => {
  const metric = event.metric;

  // Deduplicate story IDs
  const storyIds = Array.from(new Set(event.updates.map(u => u.storyId)));

  // 1) Batch-get all the affected stories, including tenantId in each Key
  const storiesById: Record<string, StoryItem> = {};
  for (const idsChunk of chunk(storyIds, 25)) {
    const getCmd = new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: idsChunk.map(id => ({
            tenantId: "tenant-abc",
            id,
          })),
        },
      },
    });
    const response = await client.send(getCmd);
    const items = response.Responses?.[TABLE_NAME] as StoryItem[] | undefined;
    if (items) {
      for (const story of items) {
        storiesById[story.id] = story;
      }
    }
  }

  // 2) Apply the rating updates in-memory
  for (const { storyId, newRating } of event.updates) {
    const story = storiesById[storyId];
    if (story) {
      story.elo[metric].rating = newRating;
    }
  }

  // 3) Batch-write the modified stories back
  const updatedStories = Object.values(storiesById);
  for (const storiesChunk of chunk(updatedStories, 25)) {
    const writeCmd = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: storiesChunk.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    });
    await client.send(writeCmd);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Ratings updated successfully",
      updated: updatedStories.length,
    }),
  };
};

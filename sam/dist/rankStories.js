import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, BatchGetCommand, } from '@aws-sdk/lib-dynamodb';
const TABLE_NAME = process.env.STORIES_TABLE;
const dynamo = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamo);
const MIN_SPAN = 100;
export async function rankStories({ tenantId, metric, orderedStoryIds, }) {
    // === Step 1: Chunk story IDs and batch fetch ===
    const chunks = [];
    for (let i = 0; i < orderedStoryIds.length; i += 25) {
        chunks.push(orderedStoryIds.slice(i, i + 25));
    }
    const stories = [];
    for (const chunk of chunks) {
        const keys = chunk.map(id => ({ tenantId, id }));
        const res = await docClient.send(new BatchGetCommand({
            RequestItems: {
                [TABLE_NAME]: { Keys: keys },
            }
        }));
        const retrieved = res.Responses?.[TABLE_NAME] ?? [];
        stories.push(...retrieved);
    }
    if (stories.length !== orderedStoryIds.length) {
        throw new Error(`Expected ${orderedStoryIds.length} stories, but retrieved ${stories.length}`);
    }
    // === Step 2: Compute rating range and mapping ===
    const ratings = stories.map(story => story.elo[metric].rating);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const rawSpan = maxRating - minRating;
    const span = Math.max(rawSpan, MIN_SPAN);
    const mid = (minRating + maxRating) / 2;
    const adjustedMin = mid - span / 2;
    const adjustedMax = mid + span / 2;
    // === Step 3: Apply new ratings ===
    const idToStory = Object.fromEntries(stories.map(s => [s.id, s]));
    const n = orderedStoryIds.length;
    const updates = orderedStoryIds.map((id, index) => {
        const story = idToStory[id];
        const targetRating = adjustedMin + (adjustedMax - adjustedMin) * (n - 1 - index) / (n - 1);
        return {
            ...story,
            elo: {
                ...story.elo,
                [metric]: {
                    ...story.elo[metric],
                    rating: targetRating,
                }
            },
            updatedAt: new Date().toISOString(),
        };
    });
    // === Step 4: Batch Write Updates ===
    for (let i = 0; i < updates.length; i += 25) {
        const chunk = updates.slice(i, i + 25);
        const putRequests = chunk.map(story => ({
            PutRequest: { Item: story },
        }));
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [TABLE_NAME]: putRequests,
            }
        }));
    }
    return { success: true, updatedCount: updates.length };
}

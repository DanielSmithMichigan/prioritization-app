import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand, BatchWriteCommand, } from "@aws-sdk/lib-dynamodb";
import { authenticate, getTenantId } from './auth.js';
import { headers } from './headers.js';
const TABLE_NAME = process.env.STORIES_TABLE;
const rawClient = new DynamoDBClient({});
const client = DynamoDBDocumentClient.from(rawClient);
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
export const batchUpdateRatings = async (event) => {
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
            headers,
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }
    const tenantId = getTenantId(user);
    if (!event.body) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({ message: 'Bad Request: Missing event body' }),
        };
    }
    const payload = JSON.parse(event.body);
    const metric = payload.metric;
    // Deduplicate story IDs
    const storyIds = Array.from(new Set(payload.updates.map(u => u.storyId)));
    // 1) Batch-get all the affected stories, including tenantId in each Key
    const storiesById = {};
    for (const idsChunk of chunk(storyIds, 25)) {
        const getCmd = new BatchGetCommand({
            RequestItems: {
                [TABLE_NAME]: {
                    Keys: idsChunk.map(id => ({
                        tenantId,
                        id,
                    })),
                },
            },
        });
        const response = await client.send(getCmd);
        const items = response.Responses?.[TABLE_NAME];
        if (items) {
            for (const story of items) {
                storiesById[story.id] = story;
            }
        }
    }
    // 2) Apply the rating updates in-memory
    for (const { storyId, newRating } of payload.updates) {
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
        headers,
        body: JSON.stringify({
            message: "Ratings updated successfully",
            updated: updatedStories.length,
        }),
    };
};

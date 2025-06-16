import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE;
const BATCH_SIZE = 25;
function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
export async function createStories(input) {
    const { tenantId, titles } = input;
    const stories = titles.map(rawTitle => {
        let category = 'uncategorized';
        let title = rawTitle.trim();
        const colonIndex = title.indexOf(':');
        if (colonIndex > 0) {
            const potentialCategory = title.slice(0, colonIndex).trim();
            const remainingTitle = title.slice(colonIndex + 1).trim();
            if (remainingTitle.length > 0) {
                category = capitalizeFirst(potentialCategory.toLowerCase());
                title = remainingTitle;
            }
        }
        return {
            id: uuidv4(),
            tenantId,
            title,
            category,
            elo: {
                impact: { rating: 1200, uncertainty: 300 },
                estimatedTime: { rating: 1200, uncertainty: 300 },
                risk: { rating: 1200, uncertainty: 300 },
                visibility: { rating: 1200, uncertainty: 300 }
            },
            createdAt: new Date().toISOString()
        };
    });
    const chunks = chunkArray(stories, BATCH_SIZE);
    for (const chunk of chunks) {
        const requestItems = chunk.map(item => ({
            PutRequest: { Item: item }
        }));
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [TABLE_NAME]: requestItems
            }
        }));
    }
    return { inserted: stories.length };
}

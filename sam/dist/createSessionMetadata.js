import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_METADATA_TABLE;
export const handler = async (event) => {
    try {
        console.log('creating session 2');
        const body = JSON.parse(event.body || '{}');
        const { sessionId, stories, metric } = body;
        if (!sessionId || !Array.isArray(stories) || stories.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "sessionId and stories are required" }),
            };
        }
        console.log('putting to dynamo');
        const now = new Date().toISOString();
        await ddb.send(new PutCommand({
            TableName: tableName,
            Item: {
                sessionId,
                stories, // store the selected stories or their IDs
                metric, // e.g., 'impact'
                startedAt: now,
                status: "in-progress"
            }
        }));
        console.log('put to dynamo');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Session metadata stored", sessionId }),
        };
    }
    catch (err) {
        console.error("Error saving session metadata:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};

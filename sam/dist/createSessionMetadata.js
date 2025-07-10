import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { authenticate, getTenantId } from './auth.js';
import { headers } from './headers.js';
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_METADATA_TABLE;
export const handler = async (event) => {
    try {
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
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' }),
            };
        }
        const tenantId = getTenantId(user);
        const body = JSON.parse(event.body || '{}');
        const { sessionId, stories, metric } = body;
        if (!sessionId || !Array.isArray(stories) || stories.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "sessionId and stories are required" }),
            };
        }
        const now = new Date().toISOString();
        await ddb.send(new PutCommand({
            TableName: tableName,
            Item: {
                sessionId,
                stories,
                metric,
                startedAt: now,
                status: "in-progress",
                tenantId
            }
        }));
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

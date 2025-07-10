import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { authenticate, getTenantId } from './auth.js';
import { headers } from './headers.js';
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE;
export async function fetchStory(event) {
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
    const storyId = event.pathParameters?.storyId;
    if (!storyId) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({ message: 'Bad Request: Missing storyId' }),
        };
    }
    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { tenantId, id: storyId },
    }));
    if (!result.Item) {
        return {
            headers,
            statusCode: 404,
            body: JSON.stringify({ message: 'Story not found' }),
        };
    }
    return {
        headers,
        statusCode: 200,
        body: JSON.stringify(result.Item),
    };
}

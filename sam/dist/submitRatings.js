import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_DATA_TABLE;
export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { sessionId, userId, userName, ratings } = body;
        if (!sessionId || !userId || !ratings || typeof ratings !== 'object') {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "sessionId, userId, and ratings are required" }),
            };
        }
        await ddb.send(new PutCommand({
            TableName: tableName,
            Item: {
                sessionId,
                userId,
                userName,
                ratings,
                completed: true,
            }
        }));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Ratings saved and session marked complete." }),
        };
    }
    catch (err) {
        console.error("Error saving user ratings:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};

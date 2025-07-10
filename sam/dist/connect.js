import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { authenticate, getTenantId } from './auth.js';
import { headers } from './headers.js';
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_TABLE;
export const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const token = event.queryStringParameters?.token;
    if (!token) {
        return {
            headers,
            statusCode: 401,
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
    await ddb.send(new PutCommand({
        TableName: tableName,
        Item: {
            connectionId,
            token,
            tenantId
        }
    }));
    return {
        statusCode: 200,
        body: 'Connected.',
    };
};

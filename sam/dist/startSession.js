import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { authenticate } from './auth.js';
import { headers } from './headers.js';
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_TABLE;
const domain = process.env.DOMAIN_NAME;
const stage = process.env.STAGE;
const api = new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`
});
export const handler = async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { sessionId } = body;
    const connectionId = event.requestContext.connectionId;
    const connectionRecord = await ddb.send(new GetCommand({
        TableName: tableName,
        Key: {
            connectionId
        }
    }));
    const token = connectionRecord.Item?.token;
    if (!token) {
        return {
            statusCode: 401,
            headers,
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
    const scan = await ddb.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'sessionId = :sid',
        ExpressionAttributeValues: { ':sid': sessionId }
    }));
    const broadcast = scan.Items?.map(item => api.send(new PostToConnectionCommand({
        ConnectionId: item.connectionId,
        Data: Buffer.from(JSON.stringify({ type: 'start' }))
    }))) ?? [];
    await Promise.allSettled(broadcast);
    return {
        statusCode: 200,
        headers,
    };
};

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_TABLE;
const domain = process.env.DOMAIN_NAME;
const stage = process.env.STAGE;
const api = new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`
});
export const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    // Find the session the user was in
    const scanResult = await ddb.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'connectionId = :id',
        ExpressionAttributeValues: { ':id': connectionId }
    }));
    const sessionId = scanResult.Items?.[0]?.sessionId;
    if (!sessionId) {
        // Clean up just in case
        await ddb.send(new DeleteCommand({
            TableName: tableName,
            Key: { connectionId }
        }));
        return { statusCode: 200 };
    }
    // Delete the connection from the table
    await ddb.send(new DeleteCommand({
        TableName: tableName,
        Key: { connectionId }
    }));
    // Fetch remaining users in session
    const remaining = await ddb.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'sessionId = :sid',
        ExpressionAttributeValues: { ':sid': sessionId }
    }));
    const users = remaining.Items?.map(item => item.userName) ?? [];
    // Broadcast updated user list
    const broadcast = remaining.Items?.map(item => api.send(new PostToConnectionCommand({
        ConnectionId: item.connectionId,
        Data: Buffer.from(JSON.stringify({ type: 'sessionUsers', users }))
    }))) ?? [];
    await Promise.allSettled(broadcast);
    return { statusCode: 200 };
};

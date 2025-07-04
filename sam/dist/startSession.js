import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
    const body = JSON.parse(event.body || '{}');
    const { sessionId } = body;
    // Fetch all connections in this session
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
    return { statusCode: 200 };
};

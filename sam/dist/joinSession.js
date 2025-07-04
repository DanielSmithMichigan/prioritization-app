import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
    const { sessionId, userName, userId } = body;
    // Save connection to DynamoDB
    await ddb.send(new PutCommand({
        TableName: tableName,
        Item: {
            connectionId,
            sessionId,
            userName,
            userId
        }
    }));
    // Get all users in this session
    const queryResult = await ddb.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'sessionId-index',
        KeyConditionExpression: 'sessionId = :sid',
        ExpressionAttributeValues: {
            ':sid': sessionId
        }
    }));
    const users = queryResult.Items?.map(item => item.userName) ?? [];
    await api.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({
            type: 'connectionId',
            connectionId
        }))
    }));
    const broadcasts = queryResult.Items?.map(item => api.send(new PostToConnectionCommand({
        ConnectionId: item.connectionId,
        Data: Buffer.from(JSON.stringify({ type: 'sessionUsers', users }))
    }))) ?? [];
    await Promise.allSettled(broadcasts);
    return { statusCode: 200 };
};

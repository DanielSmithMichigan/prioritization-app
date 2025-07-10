import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { authenticate } from './auth.js';
import { headers } from './headers.js';
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSION_TABLE;
const sessionMetadataTableName = process.env.SESSION_METADATA_TABLE;
const domain = process.env.DOMAIN_NAME;
const stage = process.env.STAGE;
const api = new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`
});
export const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body || '{}');
    const { sessionId, userName, userId } = body;
    const connectionRecord = await ddb.send(new GetCommand({
        TableName: tableName,
        Key: {
            connectionId
        }
    }));
    const token = connectionRecord.Item?.token;
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
    // Save connection to DynamoDB
    await ddb.send(new UpdateCommand({
        TableName: tableName,
        Key: {
            connectionId,
        },
        UpdateExpression: 'SET #sessionId = :sessionId, #userName = :userName, #userId = :userId',
        ExpressionAttributeNames: {
            '#sessionId': 'sessionId',
            '#userName': 'userName',
            '#userId': 'userId',
        },
        ExpressionAttributeValues: {
            ':sessionId': sessionId,
            ':userName': userName,
            ':userId': userId,
        }
    }));
    await ddb.send(new UpdateCommand({
        TableName: sessionMetadataTableName,
        Key: {
            sessionId: sessionId,
        },
        UpdateExpression: 'SET #connections = list_append(if_not_exists(#connections, :empty_list), :c)',
        ExpressionAttributeNames: {
            '#connections': 'connections',
        },
        ExpressionAttributeValues: {
            ':c': [connectionId],
            ':empty_list': [],
        },
    }));
    const sessionMetadata = await ddb.send(new GetCommand({
        TableName: sessionMetadataTableName,
        Key: {
            sessionId: sessionId
        },
        ConsistentRead: true,
    }));
    const connectionIds = sessionMetadata.Item?.connections ?? [];
    let users = [];
    let connectionItems = [];
    if (connectionIds.length > 0) {
        const batchGetResult = await ddb.send(new BatchGetCommand({
            RequestItems: {
                [tableName]: {
                    Keys: connectionIds.map((id) => ({ connectionId: id })),
                    ConsistentRead: true,
                }
            }
        }));
        connectionItems = batchGetResult.Responses?.[tableName] ?? [];
        users = connectionItems.map(item => item.userName);
    }
    await api.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({
            type: 'connectionId',
            connectionId
        }))
    }));
    const broadcasts = connectionItems.map(item => {
        api.send(new PostToConnectionCommand({
            ConnectionId: item.connectionId,
            Data: Buffer.from(JSON.stringify({ type: 'sessionUsers', users }))
        }));
    });
    await Promise.allSettled(broadcasts);
    return {
        headers,
        statusCode: 200
    };
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { headers } from './headers.js';
import { authenticate, getTenantId } from './auth.js';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const dataTable = process.env.SESSION_DATA_TABLE!;
const connectionsTable = process.env.SESSION_CONNECTIONS_TABLE!;
const domain = process.env.DOMAIN_NAME!;
const stage = process.env.STAGE!;
const api = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

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
    const { sessionId, ratings, userId, connectionId } = body;

    if (!sessionId || !ratings || !userId || !connectionId || typeof ratings !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "sessionId, userId and ratings are required" }),
      };
    }

    // 1) Store participant's ratings + completion flag in SessionData
    await ddb.send(new PutCommand({
      TableName: dataTable,
      Item: {
        sessionId,
        connectionId,
        userId,
        ratings,
        completed: true,
        tenantId,
      },
    }));

    // 2) Fetch this participant's session connection to get their userName
    const connectionData = await ddb.send(new QueryCommand({
      TableName: connectionsTable,
      IndexName: "sessionId-index",   // use GSI to find connections for this session
      KeyConditionExpression: "sessionId = :sid",
      ExpressionAttributeValues: { ":sid": sessionId },
    }));

    const participantConn = connectionData.Items?.find(conn => conn.userId === userId);

    if (!participantConn) {
      console.warn(`Could not find session connection for userId=${userId}`);
    }

    const updatedParticipant = {
      userName: participantConn?.userName || "Unknown",
      completed: true,
    };

    console.log("Updated participant:", updatedParticipant);

    // 3) Query all active WebSocket connections for this session
    const connections = connectionData.Items || [];

    // 4) Broadcast update about THIS participant to all connections
    const broadcast = connections.map(conn =>
      api.send(new PostToConnectionCommand({
        ConnectionId: conn.connectionId,
        Data: Buffer.from(JSON.stringify({
          type: "participantsUpdate",
          participants: [updatedParticipant],   // send just this participant's update
        })),
      }))
    );

    await Promise.allSettled(broadcast);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Ratings saved and participant update broadcasted." }),
    };
  } catch (err) {
    console.error("Error finishing session:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

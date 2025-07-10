import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { authenticate, hasPermission, getTenantId } from './auth.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { headers } from './headers.js';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const INVITES_TABLE = process.env.INVITES_TABLE!;

export async function createInvite(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

  if (!event.body) {
    return {
      headers,
      statusCode: 400,
      body: JSON.stringify({ message: 'Bad Request: Missing event body' }),
    };
  }

  const { email, role, tenantId: tenantIdFromEventBody } = JSON.parse(event.body);

  if (!email || !role) {
    return {
      headers,
      statusCode: 400,
      body: JSON.stringify({ message: 'Bad Request: Missing email or role' }),
    };
  }

  const tenantIdFromAuth0 = getTenantId(user);

  let tenantIdToUse = tenantIdFromAuth0;

  if (tenantIdFromEventBody) {
    if (!hasPermission(user, 'invite:any_tenant')) {
      return {
        headers,
        statusCode: 403,
        body: JSON.stringify({ message: 'Forbidden: You do not have permission to create invites for other tenants.' }),
      };
    }
    tenantIdToUse = tenantIdFromEventBody;
  }

  const inviteToken = uuidv4();
  const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days

  const invite = {
    inviteToken,
    targetTenantId: tenantIdToUse,
    role,
    email,
    ttl,
  };

  await docClient.send(new PutCommand({
    TableName: INVITES_TABLE,
    Item: invite,
  }));

  const inviteLink = `https://your-app.com/signup?invite=${inviteToken}`;

  return {
    headers,
    statusCode: 200,
    body: JSON.stringify({ inviteLink }),
  };
}

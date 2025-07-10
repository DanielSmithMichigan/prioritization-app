import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { headers } from './headers.js';
import { authenticate } from "./auth.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TENANTS_TABLE_NAME;

/**
 * @method GET
 * @description Retrieves the list of all tenants if the user has the 'invite:any_tenant' permission.
 */
export const getTenantsHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!tableName) {
    console.error("TENANTS_TABLE_NAME environment variable is not set.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error: Missing configuration." }),
    };
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
        headers,
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const userPermissions = user['permissions'] as string[] || [];
    // The hasPermission function will be implemented in a future step.
    // For now, we assume it decodes a JWT from the event and checks claims.
    if (!userPermissions.includes('invite:any_tenant')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: "Forbidden: You do not have permission to view tenants." }),
      };
    }

    const command = new ScanCommand({
      TableName: tableName,
      ProjectionExpression: "tenantId, #nm",
      ExpressionAttributeNames: {
        "#nm": "name",
      },
    });

    const response = await docClient.send(command);
    const tenants = response.Items;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(tenants),
    };
  } catch (error) {
    console.error("Error getting tenants:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

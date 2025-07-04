// connect.ts
import { APIGatewayEvent } from 'aws-lambda';

export const handler = async (event: APIGatewayEvent) => {
  return {
    statusCode: 200,
    body: 'Connected.',
  };
};

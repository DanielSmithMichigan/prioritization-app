import { fetchStory } from "./fetchStory.js";
import { createStories } from "./createStories.js";
import { getAllStories } from './getAllStories.js';
import { batchUpdateRatings } from './batchSliderUpdateStories.js';
import { handler as createSessionMetadata } from "./createSessionMetadata.js";
import { handler as getSessionMetadata } from "./getSessionMetadata.js";
import { headers } from './headers.js'
import * as _ from 'lodash';
import { authenticate } from "./auth.js";

export const handler = async (event: any, context: any, callback: any) => {

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const route = event.path;
    const method = event.httpMethod;    
    const token = event.headers.Authorization?.split(' ')[1];
  
    if (!token) {
      return {
        statusCode: 403,
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

    if (route === "/session/create" && method === "POST") {
      return await createSessionMetadata(event, context, callback);
    }

    if (route === "/session/get" && method === "GET") {
      return await getSessionMetadata(event, context, callback);
    }

    if (route === "/elo/batchSliderUpdate" && method === "POST") {
      return batchUpdateRatings(event);
    }


    if (route === "/stories/getAll" && method === "POST") {
      return getAllStories(event);
    }

    if (route === "/story/create" && method === "POST") {
      return createStories(event);
    }

    if (route === "/story" && method === "POST") {
      return fetchStory(event);
    }

    return { statusCode: 404, headers, body: "Not found" };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};

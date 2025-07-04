import { updateEloRating } from "./updateElo.js";
import { fetchStory } from "./fetchStory.js";
import { createStories } from "./createStories.js";
import { getAllStories } from './getAllStories.js';
import { rankStories } from './rankStories.js';
import { batchUpdateRatings } from './batchSliderUpdateStories.js';
import { handler as createSessionMetadata } from "./createSessionMetadata.js";
import { handler as getSessionMetadata } from "./getSessionMetadata.js";
import { headers } from './headers.js';
export const handler = async (event, context, callback) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }
    try {
        const route = event.path;
        const method = event.httpMethod;
        const body = event.body ? JSON.parse(event.body) : {};
        if (route === "/session/create" && method === "POST") {
            console.log('creating session');
            return await createSessionMetadata(event, context, callback);
        }
        if (route === "/session/get" && method === "GET") {
            return await getSessionMetadata(event, context, callback);
        }
        if (route === "/elo/batchSliderUpdate" && method === "POST") {
            const result = await batchUpdateRatings(body);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        }
        if (route === "/stories/getAll" && method === "POST") {
            const { tenantId, limit, nextToken } = body;
            if (!tenantId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Missing tenantId" })
                };
            }
            const result = await getAllStories({ tenantId, limit: limit || 1, nextToken });
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }
        if (route === "/story/create" && method === "POST") {
            const { tenantId, userId, titles } = body;
            if (!tenantId || !userId || !Array.isArray(titles)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Invalid input" })
                };
            }
            const result = await createStories({ tenantId, userId, titles });
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }
        if (route === "/elo/update" && method === "POST") {
            const result = await updateEloRating(body);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        }
        if (route === "/elo/rankBatch" && method === "POST") {
            const { tenantId, metric, orderedStoryIds } = body;
            if (!tenantId || !metric || !Array.isArray(orderedStoryIds) || orderedStoryIds.length < 2) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Missing or invalid tenantId, metric, or story list" })
                };
            }
            const result = await rankStories({ tenantId, metric, orderedStoryIds });
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }
        if (route === "/story" && method === "POST") {
            const { tenantId, storyId } = body;
            const result = await fetchStory(tenantId, storyId);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        }
        return { statusCode: 404, headers, body: "Not found" };
    }
    catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

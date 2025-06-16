import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { updateElo } from "./eloUtils.js";
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STORIES_TABLE;
export async function updateEloRating(input) {
    const { tenantId, leftStoryId, rightStoryId, winnerStoryId, metric } = input;
    const [leftRes, rightRes] = await Promise.all([
        docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { tenantId, id: leftStoryId } })),
        docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { tenantId, id: rightStoryId } }))
    ]);
    if (!leftRes.Item || !rightRes.Item)
        throw new Error("One or both stories not found");
    const leftStory = leftRes.Item;
    const rightStory = rightRes.Item;
    const winner = leftStory.id === winnerStoryId ? leftStory : rightStory;
    const loser = leftStory.id === winnerStoryId ? rightStory : leftStory;
    const [updatedWinner, updatedLoser] = updateElo(winner.elo[metric], loser.elo[metric]);
    winner.elo[metric] = updatedWinner;
    loser.elo[metric] = updatedLoser;
    await Promise.all([
        docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: winner })),
        docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: loser }))
    ]);
    return { leftStory, rightStory };
}

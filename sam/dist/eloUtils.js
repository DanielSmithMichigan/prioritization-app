export function updateElo(winner, loser) {
    const k = 32;
    const expectedWin = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    return [
        { ...winner, rating: Math.round(winner.rating + k * (1 - expectedWin)) },
        { ...loser, rating: Math.round(loser.rating - k * (1 - expectedWin)) },
    ];
}

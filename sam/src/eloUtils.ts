export interface EloRating {
  rating: number;
  uncertainty: number;
  history?: number[];
}

export function updateElo(winner: EloRating, loser: EloRating): [EloRating, EloRating] {
  const k = 32;
  const expectedWin = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
  return [
    { ...winner, rating: Math.round(winner.rating + k * (1 - expectedWin)) },
    { ...loser, rating: Math.round(loser.rating - k * (1 - expectedWin)) },
  ];
}

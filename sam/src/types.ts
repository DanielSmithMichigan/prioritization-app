export interface EloRating {
  rating: number;
  uncertainty: number;
  history?: number[];
}

export interface Story {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  elo: { [key: string]: EloRating };
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
}
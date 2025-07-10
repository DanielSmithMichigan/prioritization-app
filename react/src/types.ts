
export type metricKeys = 'impact' | 'estimatedTime' | 'risk' | 'visibility';

interface EloRating {
  rating: number;
  uncertainty: number;
  history?: number[];
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  category: string;
  elo: Record<metricKeys, EloRating>
}
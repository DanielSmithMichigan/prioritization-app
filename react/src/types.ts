
export type metricKeys = 'impact' | 'estimatedTime' | 'risk' | 'visibility';

interface EloRating {
  rating: number;
  uncertainty: number;
  history?: number[];
}

export interface Story {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  elo: {
    impact: EloRating;
    estimatedTime: EloRating;
    risk: EloRating;
    visibility: EloRating;
  };
}

export interface Comparison {
  leftId: string;
  rightId: string;
  metric: keyof Story['elo'];
}
export type RiskCategory =
  | 'cost'
  | 'schedule'
  | 'design'
  | 'procurement'
  | 'material'
  | 'resource'
  | 'quality'
  | 'coordination'
  | 'safety';

export interface Risk {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: 1 | 2 | 3 | 4 | 5; // 1=Rare, 5=Almost Certain
  impact: 1 | 2 | 3 | 4 | 5; // 1=Insignificant, 5=Catastrophic
  score: number; // probability * impact (1-25)
  rating: 'very-low' | 'low' | 'medium' | 'high' | 'very-high' | 'extreme';
  status: 'identified' | 'assessed' | 'mitigating' | 'monitoring' | 'closed' | 'materialized';
  ownerId: string;
  ownerName: string;
  identifiedBy: string;
  identifiedAt: string;
  assessedAt?: string;
  mitigations: Mitigation[];
  triggers: RiskTrigger[];
  relatedEntities: RelatedEntity[];
  monteCarlo?: MonteCarloResult;
  createdAt: string;
  updatedAt: string;
}

export interface Mitigation {
  id: string;
  riskId: string;
  title: string;
  description: string;
  type: 'avoid' | 'mitigate' | 'transfer' | 'accept';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  effectiveness: 1 | 2 | 3 | 4 | 5; // post-mitigation probability/impact reduction
  cost: number;
  costCurrency: string;
  responsibleId: string;
  responsibleName: string;
  dueDate: string;
  completedAt?: string;
  residualScore?: number;
}

export interface RiskTrigger {
  id: string;
  riskId: string;
  description: string;
  indicator: string;
  threshold: string;
  isActive: boolean;
  detectedAt?: string;
}

export interface RelatedEntity {
  type: 'drawing' | 'model' | 'schedule' | 'boq' | 'cost' | 'conflict' | 'revision';
  entityId: string;
  entityName: string;
  relationship: 'cause' | 'effect' | 'indicator' | 'mitigation';
}

export interface MonteCarloResult {
  simulationId: string;
  runs: number;
  meanCost: number;
  meanDuration: number;
  p10Cost: number;
  p50Cost: number;
  p90Cost: number;
  p10Duration: number;
  p50Duration: number;
  p90Duration: number;
  costDistribution: { value: number; probability: number }[];
  durationDistribution: { value: number; probability: number }[];
  runAt: string;
}

export interface RiskSummary {
  projectId: string;
  totalRisks: number;
  byCategory: { category: RiskCategory; count: number; avgScore: number }[];
  byRating: { rating: Risk['rating']; count: number }[];
  byStatus: { status: Risk['status']; count: number }[];
  topRisks: Risk[]; // top 10 by score
  openHighRisks: number;
  mitigationCompletionRate: number;
  riskTrend: { date: string; totalScore: number; count: number }[];
}

export interface RiskHeatmapData {
  probability: number;
  impact: number;
  count: number;
  risks: Risk[];
}
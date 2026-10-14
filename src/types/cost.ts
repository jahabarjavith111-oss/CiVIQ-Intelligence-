export type CostCategory =
  | 'material'
  | 'labour'
  | 'equipment'
  | 'transport'
  | 'overhead'
  | 'tax'
  | 'wastage'
  | 'markup';

export interface CostBreakdown {
  id: string;
  projectId: string;
  category: CostCategory;
  subCategory: string;
  budgeted: number;
  actual: number;
  committed: number;
  forecast: number;
  variance: number;
  variancePercent: number;
  currency: string;
  period: string; // YYYY-MM
  details: CostDetail[];
  updatedAt: string;
}

export interface CostDetail {
  id: string;
  breakdownId: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  date: string;
  source: 'purchase-order' | 'timesheet' | 'invoice' | 'estimate' | 'adjustment';
  referenceId?: string;
  referenceType?: string;
}

export interface BudgetSummary {
  projectId: string;
  totalBudget: number;
  totalCommitted: number;
  totalActual: number;
  totalForecast: number;
  remainingBudget: number;
  budgetHealth: 'on-track' | 'at-risk' | 'over-budget';
  currency: string;
  byCategory: { category: CostCategory; budgeted: number; actual: number; variance: number }[];
  sCurve: SCurvePoint[];
}

export interface SCurvePoint {
  period: string;
  planned: number;
  actual: number;
  forecast: number;
}

export interface CostVariance {
  id: string;
  projectId: string;
  category: CostCategory;
  period: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  explanation?: string;
  impact: 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'accepted';
  createdAt: string;
  resolvedAt?: string;
}

export interface ForecastScenario {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  assumptions: ForecastAssumption[];
  results: ForecastResult;
  isBaseline: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ForecastAssumption {
  category: CostCategory;
  factor: number; // multiplier
  reason: string;
}

export interface ForecastResult {
  totalForecast: number;
  byCategory: { category: CostCategory; amount: number }[];
  varianceFromBaseline: number;
  confidence: number;
}
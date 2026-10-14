export interface TakeoffItem {
  id: string;
  projectId: string;
  trade: TradeCategory;
  category: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  formula?: string;
  drawingReferences: string[]; // drawing IDs
  modelReferences: string[]; // model element IDs
  notes?: string;
  status: 'draft' | 'reviewed' | 'approved';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TradeCategory =
  | 'concrete'
  | 'steel'
  | 'cement'
  | 'bricks'
  | 'sand'
  | 'aggregate'
  | 'tiles'
  | 'paint'
  | 'doors'
  | 'windows'
  | 'pipes'
  | 'electrical'
  | 'labour'
  | 'equipment';

export interface TakeoffSummary {
  trade: TradeCategory;
  itemCount: number;
  totalQuantity: number;
  unit: string;
  lastUpdated: string;
}

export interface TakeoffTemplate {
  id: string;
  name: string;
  trade: TradeCategory;
  items: Omit<TakeoffItem, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>[];
}

export interface ExportTakeoffOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeFormulas: boolean;
  includeReferences: boolean;
  groupByTrade: boolean;
}
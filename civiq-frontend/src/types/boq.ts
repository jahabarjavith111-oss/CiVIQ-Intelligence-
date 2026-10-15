export interface WorkPackage {
  id: string;
  projectId: string;
  parentId?: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  order: number;
  children?: WorkPackage[];
  items: BOQItem[];
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BOQItem {
  id: string;
  workPackageId: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  rateAnalysis?: RateAnalysis;
  takeoffReferences: string[]; // takeoff item IDs
  modelReferences: string[]; // model element IDs
  status: 'draft' | 'priced' | 'approved' | 'locked';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RateAnalysis {
  id: string;
  boqItemId: string;
  materials: RateComponent[];
  labour: RateComponent[];
  equipment: RateComponent[];
  overheadPercent: number;
  profitPercent: number;
  totalRate: number;
  currency: string;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RateComponent {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitRate: number;
  amount: number;
  source: 'manual' | 'catalog' | 'historical' | 'supplier-quote';
  reference?: string;
}

export interface BOQSummary {
  totalItems: number;
  totalAmount: number;
  currency: string;
  byWorkPackage: { workPackageId: string; name: string; amount: number }[];
  byTrade: { trade: string; amount: number }[];
}

export interface CreateWorkPackageData {
  projectId: string;
  parentId?: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateBOQItemData {
  workPackageId: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate?: number;
}
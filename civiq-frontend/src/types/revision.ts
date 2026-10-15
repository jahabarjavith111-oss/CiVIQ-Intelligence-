export interface Revision {
  id: string;
  projectId: string;
  fromVersion: number;
  toVersion: number;
  title: string;
  description?: string;
  type: 'drawing' | 'model' | 'schedule' | 'boq' | 'cost';
  status: 'draft' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'implemented';
  changes: RevisionChange[];
  impacts: RevisionImpact;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  implementedAt?: string;
}

export interface RevisionChange {
  id: string;
  revisionId: string;
  entityType: 'drawing' | 'model-element' | 'schedule-activity' | 'boq-item' | 'cost-item';
  entityId: string;
  action: 'added' | 'removed' | 'moved' | 'modified';
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
  visualEvidence?: VisualEvidence;
}

export interface VisualEvidence {
  type: 'image' | '3d-screenshot' | 'drawing-overlay';
  beforeUrl?: string;
  afterUrl?: string;
  overlayUrl?: string;
  annotations: EvidenceAnnotation[];
}

export interface EvidenceAnnotation {
  id: string;
  type: 'point' | 'line' | 'rectangle' | 'polygon' | 'text';
  coordinates: number[];
  label: string;
  color: string;
}

export interface RevisionImpact {
  cost: ImpactDetail;
  schedule: ImpactDetail;
  material: ImpactDetail;
  risk: ImpactDetail;
}

export interface ImpactDetail {
  magnitude: 'none' | 'low' | 'medium' | 'high';
  value: number; // absolute change
  percent: number; // percentage change
  description: string;
  details: string[];
}

export interface RevisionComparison {
  revisionId: string;
  drawingComparisons: DrawingComparison[];
  modelComparisons: ModelComparison[];
  scheduleComparisons: ScheduleComparison[];
  boqComparisons: BOQComparison[];
  costComparisons: CostComparison[];
}

export interface DrawingComparison {
  drawingId: string;
  drawingName: string;
  changes: DrawingChange[];
  similarity: number; // 0-1
}

export interface DrawingChange {
  type: 'added' | 'removed' | 'modified' | 'moved';
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  description: string;
  confidence: number;
}

export interface ModelComparison {
  modelId: string;
  addedElements: string[];
  removedElements: string[];
  modifiedElements: ModifiedModelElement[];
}

export interface ModifiedModelElement {
  elementId: string;
  propertyChanges: { property: string; oldValue: unknown; newValue: unknown }[];
  geometryChanged: boolean;
}

export interface ScheduleComparison {
  addedActivities: string[];
  removedActivities: string[];
  modifiedActivities: ModifiedScheduleActivity[];
  criticalPathChanged: boolean;
  projectFinishVariance: number; // days
}

export interface ModifiedScheduleActivity {
  activityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface BOQComparison {
  addedItems: string[];
  removedItems: string[];
  modifiedItems: ModifiedBOQItem[];
  totalAmountVariance: number;
}

export interface ModifiedBOQItem {
  itemId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface CostComparison {
  addedItems: string[];
  removedItems: string[];
  modifiedItems: ModifiedCostItem[];
  totalVariance: number;
}

export interface ModifiedCostItem {
  itemId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
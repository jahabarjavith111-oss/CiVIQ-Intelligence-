export interface Conflict {
  id: string;
  projectId: string;
  drawingIds?: string[]; // if drawing-based conflict
  modelId?: string; // if 3D model conflict
  type: 'architecture-vs-structural' | 'structural-vs-mep' | 'mep-vs-electrical' | 'mep-vs-plumbing' | 'dimension' | 'position' | 'missing-element';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in-review' | 'resolved' | 'approved' | 'rejected' | 'false-positive';
  title: string;
  description: string;
  location?: {
    drawingId?: string;
    page?: number;
    bbox?: { x: number; y: number; width: number; height: number };
    modelCoordinates?: { x: number; y: number; z: number };
  };
  elements: ConflictElement[];
  assignedTo?: string;
  reportedBy: string;
  reportedAt: string;
  reviewedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  attachments: ConflictAttachment[];
  comments: ConflictComment[];
}

export interface ConflictElement {
  id: string;
  conflictId: string;
  elementId: string; // drawing element or model element ID
  elementType: 'drawing' | 'model';
  description: string;
  bbox?: { x: number; y: number; width: number; height: number };
  modelCoordinates?: { x: number; y: number; z: number };
}

export interface ConflictAttachment {
  id: string;
  conflictId: string;
  fileName: string;
  fileUrl: string;
  type: 'image' | 'pdf' | 'markup';
  uploadedBy: string;
  uploadedAt: string;
}

export interface ConflictComment {
  id: string;
  conflictId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ConflictSummary {
  projectId: string;
  total: number;
  bySeverity: { severity: Conflict['severity']; count: number }[];
  byType: { type: Conflict['type']; count: number }[];
  byStatus: { status: Conflict['status']; count: number }[];
  openCritical: number;
  resolutionRate: number;
  avgResolutionTime: number; // days
}

export interface ClashDetectionResult {
  modelId: string;
  runId: string;
  runAt: string;
  conflicts: Conflict[];
  statistics: {
    totalClashes: number;
    newClashes: number;
    resolvedClashes: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}
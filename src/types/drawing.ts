export interface Drawing {
  id: string;
  projectId: string;
  name: string;
  originalName: string;
  type: 'architectural' | 'structural' | 'mep' | 'electrical' | 'plumbing' | 'civil';
  discipline: string;
  version: number;
  status: 'uploaded' | 'processing' | 'analyzed' | 'approved' | 'rejected';
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  pages: number;
  metadata?: DrawingMetadata;
  analysis?: DrawingAnalysis;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingMetadata {
  dimensions?: { width: number; height: number; unit: string };
  scale?: string;
  titleBlock?: Record<string, string>;
  revision?: string;
  drawingNumber?: string;
}

export interface DrawingAnalysis {
  id: string;
  drawingId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  elements: DetectedElement[];
  ocrText: OCRResult[];
  confidence: number;
  processedAt?: string;
  error?: string;
}

export interface DetectedElement {
  id: string;
  type: 'wall' | 'column' | 'door' | 'window' | 'dimension' | 'annotation' | 'symbol' | 'grid' | 'beam' | 'slab' | 'pipe' | 'duct' | 'cable';
  category: 'architecture' | 'structure' | 'mep' | 'electrical' | 'plumbing';
  bbox: BoundingBox;
  polygon?: Point[];
  confidence: number;
  properties: Record<string, unknown>;
  evidenceRegion: EvidenceRegion;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EvidenceRegion {
  page: number;
  bbox: BoundingBox;
  imageUrl: string;
}

export interface OCRResult {
  text: string;
  bbox: BoundingBox;
  confidence: number;
  type: 'title' | 'dimension' | 'note' | 'specification' | 'other';
}

export interface UploadDrawingData {
  projectId: string;
  file: File;
  type: Drawing['type'];
  discipline?: string;
}

export interface AnalyzeDrawingRequest {
  drawingId: string;
  options?: {
    detectElements?: boolean;
    runOCR?: boolean;
    classifyDrawing?: boolean;
  };
}
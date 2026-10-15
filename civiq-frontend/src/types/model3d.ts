export interface Model3D {
  id: string;
  projectId: string;
  name: string;
  version: number;
  fileUrl: string;
  format: 'gltf' | 'glb' | 'ifc';
  fileSize: number;
  metadata: ModelMetadata;
  floors: Floor[];
  elements: ModelElement[];
  conflicts: ModelConflict[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelMetadata {
  author?: string;
  software?: string;
  units: 'metric' | 'imperial';
  coordinateSystem?: string;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  elevation: number;
  height: number;
  modelId: string;
  visible: boolean;
  elements: string[]; // element IDs
}

export interface ModelElement {
  id: string;
  modelId: string;
  floorId?: string;
  name: string;
  category: 'architecture' | 'structure' | 'mep' | 'electrical' | 'plumbing';
  type: string; // IfcWall, IfcColumn, IfcDoor, etc.
  guid: string; // IFC GlobalId
  geometry: {
    meshId: string;
    bbox: BoundingBox3D;
  };
  properties: Record<string, unknown>;
  quantity?: ElementQuantity;
  cost?: ElementCost;
  schedule?: ElementSchedule;
  boqItems?: string[]; // BOQ item IDs
  visible: boolean;
  color?: string;
}

export interface BoundingBox3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface ElementQuantity {
  volume?: number;
  area?: number;
  length?: number;
  count?: number;
  weight?: number;
  unit: string;
}

export interface ElementCost {
  material: number;
  labour: number;
  equipment: number;
  total: number;
  currency: string;
}

export interface ElementSchedule {
  activityId?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
}

export interface ModelConflict {
  id: string;
  modelId: string;
  type: 'clash' | 'clearance' | 'routing' | 'interference';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in-review' | 'resolved' | 'approved' | 'rejected';
  elements: string[]; // conflicting element IDs
  description: string;
  location: { x: number; y: number; z: number };
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ModelViewState {
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
  };
  activeFloor: string | null;
  visibleLayers: string[];
  sectionPlanes: SectionPlane[];
  explodedView: number; // 0-1
  measurements: Measurement[];
  selectedElement: string | null;
}

export interface SectionPlane {
  id: string;
  normal: { x: number; y: number; z: number };
  constant: number;
  visible: boolean;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area';
  points: { x: number; y: number; z: number }[];
  value: number;
  unit: string;
  label?: string;
}

export interface RevisionComparison {
  fromVersion: number;
  toVersion: number;
  added: string[]; // element IDs
  removed: string[]; // element IDs
  modified: ModifiedElement[];
}

export interface ModifiedElement {
  elementId: string;
  changes: {
    property: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}
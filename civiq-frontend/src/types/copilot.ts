export type CopilotIntent =
  | 'drawing_analysis'
  | 'quantity_calculation'
  | 'boq_analysis'
  | 'cost_analysis'
  | 'schedule_analysis'
  | 'risk_analysis'
  | 'conflict_analysis'
  | 'revision_analysis'
  | 'model_query'
  | 'project_question'
  | 'what_if'
  | 'report_question';

export interface CopilotMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  intent?: CopilotIntent;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  evidence: Evidence[];
  verification: VerificationStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface Evidence {
  id: string;
  type: 'drawing' | 'model' | 'schedule' | 'boq' | 'cost' | 'risk' | 'conflict' | 'revision' | 'document' | 'calculation';
  sourceId: string;
  sourceName: string;
  excerpt: string;
  relevance: number; // 0-1
  location?: {
    drawingId?: string;
    page?: number;
    bbox?: { x: number; y: number; width: number; height: number };
    modelCoordinates?: { x: number; y: number; z: number };
    scheduleActivityId?: string;
    boqItemId?: string;
    costItemId?: string;
  };
  visualUrl?: string;
}

export type VerificationStatus = 'verified' | 'unverified' | 'partially-verified' | 'failed';

export interface CopilotConversation {
  id: string;
  projectId?: string;
  title: string;
  messages: CopilotMessage[];
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationContext {
  projectId?: string;
  drawingIds?: string[];
  modelIds?: string[];
  dateRange?: { start: string; end: string };
  filters?: Record<string, unknown>;
}

export interface CopilotTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  returns: Record<string, unknown>;
  examples: { input: Record<string, unknown>; output: unknown }[];
}

export const COPILOT_TOOLS: CopilotTool[] = [
  {
    name: 'drawing_analysis',
    description: 'Analyze drawings for elements, dimensions, annotations, and classifications',
    parameters: { drawingIds: { type: 'array', items: { type: 'string' } }, options: { type: 'object' } },
    returns: { elements: { type: 'array' }, ocrText: { type: 'array' }, confidence: { type: 'number' } },
    examples: [
      { input: { drawingIds: ['dwg-1'], options: { detectElements: true } }, output: { elements: [], confidence: 0.92 } },
    ],
  },
  {
    name: 'quantity_calculation',
    description: 'Calculate material quantities from drawings, models, or takeoff data',
    parameters: { trade: { type: 'string' }, projectId: { type: 'string' }, filters: { type: 'object' } },
    returns: { items: { type: 'array' }, totals: { type: 'object' } },
    examples: [{ input: { trade: 'concrete', projectId: 'proj-1' }, output: { items: [], totals: {} } }],
  },
  {
    name: 'boq_analysis',
    description: 'Analyze BOQ items, rates, work packages, and pricing',
    parameters: { projectId: { type: 'string' }, workPackageIds: { type: 'array' } },
    returns: { summary: { type: 'object' }, items: { type: 'array' }, variances: { type: 'array' } },
    examples: [],
  },
  {
    name: 'cost_analysis',
    description: 'Analyze costs, budgets, variances, and forecasts',
    parameters: { projectId: { type: 'string' }, category: { type: 'string' }, period: { type: 'string' } },
    returns: { breakdown: { type: 'object' }, variances: { type: 'array' }, forecast: { type: 'object' } },
    examples: [],
  },
  {
    name: 'schedule_analysis',
    description: 'Analyze schedule activities, critical path, progress, and delays',
    parameters: { projectId: { type: 'string' }, baselineId: { type: 'string' } },
    returns: { criticalPath: { type: 'object' }, progress: { type: 'object' }, delays: { type: 'array' } },
    examples: [],
  },
  {
    name: 'risk_analysis',
    description: 'Analyze risks, mitigations, Monte Carlo simulations, and risk trends',
    parameters: { projectId: { type: 'string' }, category: { type: 'string' } },
    returns: { risks: { type: 'array' }, summary: { type: 'object' }, monteCarlo: { type: 'object' } },
    examples: [],
  },
  {
    name: 'conflict_analysis',
    description: 'Analyze clashes, conflicts, and coordination issues',
    parameters: { projectId: { type: 'string' }, modelId: { type: 'string' }, severity: { type: 'string' } },
    returns: { conflicts: { type: 'array' }, summary: { type: 'object' }, trends: { type: 'array' } },
    examples: [],
  },
  {
    name: 'revision_analysis',
    description: 'Analyze revisions, changes, and their impacts',
    parameters: { projectId: { type: 'string' }, fromVersion: { type: 'number' }, toVersion: { type: 'number' } },
    returns: { changes: { type: 'array' }, impacts: { type: 'object' }, comparisons: { type: 'object' } },
    examples: [],
  },
  {
    name: 'model_query',
    description: 'Query 3D model elements, properties, quantities, and relationships',
    parameters: { modelId: { type: 'string' }, filters: { type: 'object' } },
    returns: { elements: { type: 'array' }, counts: { type: 'object' }, quantities: { type: 'object' } },
    examples: [],
  },
  {
    name: 'project_question',
    description: 'Answer general project questions using project data',
    parameters: { projectId: { type: 'string' }, question: { type: 'string' } },
    returns: { answer: { type: 'string' }, sources: { type: 'array' } },
    examples: [],
  },
  {
    name: 'what_if',
    description: 'Run what-if scenarios for cost, schedule, and risk impacts',
    parameters: { projectId: { type: 'string' }, scenario: { type: 'object' } },
    returns: { costImpact: { type: 'object' }, scheduleImpact: { type: 'object' }, riskImpact: { type: 'object' } },
    examples: [],
  },
  {
    name: 'report_question',
    description: 'Answer questions about reports and generate report insights',
    parameters: { projectId: { type: 'string' }, reportType: { type: 'string' }, question: { type: 'string' } },
    returns: { answer: { type: 'string' }, data: { type: 'object' } },
    examples: [],
  },
];
import { api } from './api';
import type { CopilotMessage, CopilotConversation, CopilotIntent, ToolCall, Evidence, ConversationContext } from '@/types/copilot';

export const copilotApi = {
  createConversation: (projectId?: string, title?: string) =>
    api.post<CopilotConversation>('/copilot/conversations', { projectId, title }),

  getConversations: (projectId?: string) =>
    api.get<CopilotConversation[]>('/copilot/conversations', { params: { projectId } }),

  getConversation: (id: string) => api.get<CopilotConversation>(`/copilot/conversations/${id}`),

  deleteConversation: (id: string) => api.delete(`/copilot/conversations/${id}`),

  sendMessage: (conversationId: string, content: string, context?: ConversationContext) =>
    api.post<{ message: CopilotMessage; streamId?: string }>(`/copilot/conversations/${conversationId}/messages`, { content, context }),

  sendMessageStream: (conversationId: string, content: string, context?: ConversationContext) => {
    // Streaming via fetch+ReadableStream comes in week 2; REST fallback for MVP
    return api.post(`/copilot/conversations/${conversationId}/messages/stream`, { content, context });
  },

  detectIntent: (message: string, context?: ConversationContext) =>
    api.post<{ intent: CopilotIntent; confidence: number; entities: Record<string, unknown> }>('/copilot/intent', { message, context }),

  executeTool: (toolCall: ToolCall) => api.post<{ result: unknown; success: boolean; error?: string }>('/copilot/tools/execute', toolCall),

  getEvidence: (messageId: string) => api.get<Evidence[]>(`/copilot/messages/${messageId}/evidence`),

  verifyResponse: (messageId: string) =>
    api.post<{ status: 'verified' | 'unverified' | 'partially-verified' | 'failed'; details: string }>(`/copilot/messages/${messageId}/verify`),

  getTools: () => api.get<{ name: string; description: string; parameters: Record<string, unknown> }[]>('/copilot/tools'),

  updateContext: (conversationId: string, context: ConversationContext) =>
    api.patch<CopilotConversation>(`/copilot/conversations/${conversationId}/context`, { context }),

  exportConversation: (id: string, format: 'json' | 'markdown' | 'pdf') =>
    api.get(`/copilot/conversations/${id}/export`, { params: { format }, responseType: 'blob' }),

  rateResponse: (messageId: string, rating: 'helpful' | 'not-helpful', feedback?: string) =>
    api.post(`/copilot/messages/${messageId}/rating`, { rating, feedback }),
};
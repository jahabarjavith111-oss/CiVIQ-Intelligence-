import { create } from 'zustand';
import type { CopilotConversation, CopilotMessage } from '@/types/copilot';

interface CopilotState {
  conversations: CopilotConversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  input: string;
  setConversations: (c: CopilotConversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  appendMessage: (conversationId: string, msg: CopilotMessage) => void;
  setStreaming: (v: boolean) => void;
  setInput: (v: string) => void;
  createLocalConversation: (projectId?: string) => string;
}

export const useCopilotStore = create<CopilotState>()((set) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  input: '',
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  appendMessage: (conversationId, msg) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages: [...c.messages, msg], updatedAt: new Date().toISOString() } : c
      ),
    })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setInput: (input) => set({ input }),
  createLocalConversation: (projectId) => {
    const id = `local-${Date.now()}`;
    const conv: CopilotConversation = {
      id, projectId, title: 'New conversation', messages: [],
      context: projectId ? { projectId } : {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    set((s) => ({ conversations: [conv, ...s.conversations], activeConversationId: id }));
    return id;
  },
}));

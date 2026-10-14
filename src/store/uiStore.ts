import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  theme: 'light' | 'dark' | 'system';
  activeModal: string | null;
  modalProps: Record<string, unknown>;
  toasts: { id: string; title: string; description?: string; variant: 'default' | 'success' | 'error' | 'warning' }[];
  openModal: (name: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  setTheme: (t: UiState['theme']) => void;
  pushToast: (t: Omit<UiState['toasts'][number], 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      activeModal: null,
      modalProps: {},
      toasts: [],
      openModal: (activeModal, modalProps = {}) => set({ activeModal, modalProps }),
      closeModal: () => set({ activeModal: null, modalProps: {} }),
      setTheme: (theme) => set({ theme }),
      pushToast: (t) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4000);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
    }),
    { name: 'civiq-ui', partialize: (s) => ({ theme: s.theme }) as UiState }
  )
);

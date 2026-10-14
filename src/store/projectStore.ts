import { create } from 'zustand';
import type { Project } from '@/types/project';

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  setProjects: (p: Project[]) => void;
  setSelectedProject: (p: Project | null) => void;
  upsertProject: (p: Project) => void;
  removeProject: (id: string) => void;
  setLoading: (v: boolean) => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),
  upsertProject: (p) =>
    set((s) => ({
      projects: s.projects.some((x) => x.id === p.id)
        ? s.projects.map((x) => (x.id === p.id ? p : x))
        : [...s.projects, p],
    })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((x) => x.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
}));

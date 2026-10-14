import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drawingsApi } from '@/services/drawings.api';
import { useUiStore } from '@/store/uiStore';
import type { UploadDrawingData, Drawing } from '@/types/drawing';

export function useDrawing(projectId?: string) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.pushToast);

  const listQuery = useQuery({
    queryKey: ['drawings', projectId],
    queryFn: async () => (await drawingsApi.list(projectId!)).data.data,
    enabled: !!projectId,
  });

  const upload = useMutation({
    mutationFn: (vars: { projectId: string; data: UploadDrawingData }) =>
      drawingsApi.upload(vars.projectId, vars.data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drawings', projectId] }),
    onError: () => toast({ title: 'Drawing upload failed', variant: 'error' }),
  });

  return { listQuery, upload };
}

export function useDrawingDetail(drawingId?: string) {
  const detailQuery = useQuery({
    queryKey: ['drawing', drawingId],
    queryFn: async () => (await drawingsApi.get(drawingId!)).data,
    enabled: !!drawingId,
  });

  const analysisQuery = useQuery({
    queryKey: ['drawing', drawingId, 'analysis'],
    queryFn: async () => (await drawingsApi.getAnalysis(drawingId!)).data,
    enabled: !!drawingId,
  });

  return { detailQuery, analysisQuery };
}

export type { Drawing };

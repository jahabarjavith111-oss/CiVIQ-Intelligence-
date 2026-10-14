# CivIQ Frontend — 10-day MVP scaffold

React + TypeScript + Vite + Tailwind v4 + React Router + TanStack Query + Zustand + RHF + Zod + Axios + Recharts + R3F + pdfjs.

## Run
```bash
cd civiq-frontend
npm install
npm run dev   # http://localhost:3000
```
MSW mocks all 14 APIs in dev (`VITE_USE_MSW=true`). Auth bypass is ON (`VITE_BYPASS_AUTH=true`) — set both false when backend is ready.

## Routes
`/`, `/login`, `/register`, `/dashboard`, `/projects`, `/projects/new`, `/projects/:id`,
`/drawings`, `/drawings/:id`, `/model-3d`, `/projects/:projectId/model-3d`,
`/copilot`, `/projects/:projectId/copilot`, `/takeoff`, `/boq`, `/cost`, `/schedule`,
`/coordination`, `/revisions`, `/risks`, `/simulation`, `/analytics`, `/documents`, `/reports`

## Backend contract
Base `VITE_API_URL`. All services in `src/services/*.api.ts` match REST paths the backend should implement
(`/api/projects`, `/api/drawings`, `/api/models`, `/api/copilot`, `/takeoff`, `/boq`, `/cost`, `/schedule`, `/coordination`, `/revisions`, `/risks`, `/simulations`, `/reports`, `/documents`, `/auth/*`).
MSW handlers in `src/mocks/handlers.ts` are the executable spec — give this file to backend.

## Notes
- 3D uses procedural sample tower; point `fileUrl` at real `/models/*.glb` + `useGLTF` for production.
- Copilot uses local intent detection + mock answers; swap `useCopilot.send` to streaming endpoint later.
- PDF.js viewer, IFC.js, real WS, PDF export are stubbed for week 2.

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './config';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { RequireAdmin } from '@/components/common/RequireAdmin';
import { PageLoader } from '@/components/common/PageLoader';

const Dashboard = lazy(() => import('@/features/command-center/pages/Dashboard'));
const ProjectsList = lazy(() => import('@/features/projects/pages/ProjectsList'));
const ProjectDetail = lazy(() => import('@/features/projects/pages/ProjectDetail'));
const ProjectNew = lazy(() => import('@/features/projects/pages/ProjectNew'));
const DrawingsList = lazy(() => import('@/features/drawings/pages/DrawingsList'));
const DrawingDetail = lazy(() => import('@/features/drawings/pages/DrawingDetail'));
const ModelWorkspace = lazy(() => import('@/features/model-3d/pages/ModelWorkspace'));
const CopilotPage = lazy(() => import('@/features/copilot/pages/CopilotPage'));
const TakeoffPage = lazy(() => import('@/features/takeoff/pages/TakeoffPage'));
const BoqPage = lazy(() => import('@/features/boq/pages/BoqPage'));
const CostPage = lazy(() => import('@/features/cost-intelligence/pages/CostPage'));
const SchedulePage = lazy(() => import('@/features/scheduling/pages/SchedulePage'));
const CoordinationPage = lazy(() => import('@/features/coordination/pages/CoordinationPage'));
const RevisionsPage = lazy(() => import('@/features/revisions/pages/RevisionsPage'));
const RisksPage = lazy(() => import('@/features/risks/pages/RisksPage'));
const SimulationPage = lazy(() => import('@/features/simulation/pages/SimulationPage'));
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage'));
const DocumentsPage = lazy(() => import('@/features/documents/pages/DocumentsPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const ActivityPage = lazy(() => import('@/features/activity/pages/ActivityPage'));
const TeamPage = lazy(() => import('@/features/team/pages/TeamPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const Landing = lazy(() => import('@/pages/marketing/Landing'));
const AdminOverview = lazy(() => import('@/features/admin/pages/AdminOverview'));
const AdminUsers = lazy(() => import('@/features/admin/pages/AdminUsers'));
const AdminProjects = lazy(() => import('@/features/admin/pages/AdminProjects'));
const AdminAi = lazy(() => import('@/features/admin/pages/AdminAi'));
const AdminHealth = lazy(() => import('@/features/admin/pages/AdminHealth'));
const AdminAudit = lazy(() => import('@/features/admin/pages/AdminAudit'));
const AdminSettings = lazy(() => import('@/features/admin/pages/AdminSettings'));
const AdminBilling = lazy(() => import('@/features/admin/pages/AdminBilling'));
const NotFound = lazy(() => import('@/pages/errors/NotFound'));
const ServerError = lazy(() => import('@/pages/errors/ServerError'));
const Maintenance = lazy(() => import('@/pages/errors/Maintenance'));

function Sus({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Sus><Landing /></Sus>} />
      <Route path={ROUTES.LOGIN} element={<Sus><Login /></Sus>} />
      <Route path={ROUTES.REGISTER} element={<Sus><Register /></Sus>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<Sus><ForgotPassword /></Sus>} />
      <Route path={ROUTES.RESET_PASSWORD} element={<Sus><ResetPassword /></Sus>} />
      <Route path={ROUTES.VERIFY_EMAIL} element={<Sus><VerifyEmail /></Sus>} />
      <Route path="/500" element={<Sus><ServerError /></Sus>} />
      <Route path="/maintenance" element={<Sus><Maintenance /></Sus>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Sus><Dashboard /></Sus>} />
          <Route path={ROUTES.PROJECTS} element={<Sus><ProjectsList /></Sus>} />
          <Route path={ROUTES.PROJECT_NEW} element={<Sus><ProjectNew /></Sus>} />
          <Route path="/projects/:id" element={<Sus><ProjectDetail /></Sus>} />
          <Route path={ROUTES.DRAWINGS} element={<Sus><DrawingsList /></Sus>} />
          <Route path="/drawings/:id" element={<Sus><DrawingDetail /></Sus>} />
          <Route path={ROUTES.MODEL_3D} element={<Sus><ModelWorkspace /></Sus>} />
          <Route path="/projects/:projectId/model-3d" element={<Sus><ModelWorkspace /></Sus>} />
          <Route path={ROUTES.COPILOT} element={<Sus><CopilotPage /></Sus>} />
          <Route path="/projects/:projectId/copilot" element={<Sus><CopilotPage /></Sus>} />
          <Route path={ROUTES.TAKEOFF} element={<Sus><TakeoffPage /></Sus>} />
          <Route path={ROUTES.BOQ} element={<Sus><BoqPage /></Sus>} />
          <Route path={ROUTES.COST} element={<Sus><CostPage /></Sus>} />
          <Route path={ROUTES.SCHEDULE} element={<Sus><SchedulePage /></Sus>} />
          <Route path={ROUTES.COORDINATION} element={<Sus><CoordinationPage /></Sus>} />
          <Route path={ROUTES.REVISIONS} element={<Sus><RevisionsPage /></Sus>} />
          <Route path={ROUTES.RISKS} element={<Sus><RisksPage /></Sus>} />
          <Route path={ROUTES.SIMULATION} element={<Sus><SimulationPage /></Sus>} />
          <Route path={ROUTES.ANALYTICS} element={<Sus><AnalyticsPage /></Sus>} />
          <Route path={ROUTES.DOCUMENTS} element={<Sus><DocumentsPage /></Sus>} />
          <Route path={ROUTES.REPORTS} element={<Sus><ReportsPage /></Sus>} />
          <Route path={ROUTES.ACTIVITY} element={<Sus><ActivityPage /></Sus>} />
          <Route path={ROUTES.TEAM} element={<Sus><TeamPage /></Sus>} />
          <Route path={ROUTES.NOTIFICATIONS} element={<Sus><NotificationsPage /></Sus>} />
          <Route path={ROUTES.SETTINGS} element={<Sus><SettingsPage /></Sus>} />
          <Route path={ROUTES.ONBOARDING} element={<Sus><Onboarding /></Sus>} />
          <Route element={<RequireAdmin />}>
            <Route path={ROUTES.ADMIN} element={<Sus><AdminOverview /></Sus>} />
            <Route path={ROUTES.ADMIN_USERS} element={<Sus><AdminUsers /></Sus>} />
            <Route path={ROUTES.ADMIN_PROJECTS} element={<Sus><AdminProjects /></Sus>} />
            <Route path={ROUTES.ADMIN_AI} element={<Sus><AdminAi /></Sus>} />
            <Route path={ROUTES.ADMIN_HEALTH} element={<Sus><AdminHealth /></Sus>} />
            <Route path={ROUTES.ADMIN_AUDIT} element={<Sus><AdminAudit /></Sus>} />
            <Route path={ROUTES.ADMIN_SETTINGS} element={<Sus><AdminSettings /></Sus>} />
            <Route path={ROUTES.ADMIN_BILLING} element={<Sus><AdminBilling /></Sus>} />
          </Route>
        </Route>
      </Route>
      <Route path="/404" element={<Sus><NotFound /></Sus>} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

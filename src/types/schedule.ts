export interface ScheduleActivity {
  id: string;
  projectId: string;
  wbsCode: string;
  name: string;
  description?: string;
  type: 'task' | 'milestone' | 'summary';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  duration: number; // working days
  actualStart?: string;
  actualFinish?: string;
  remainingDuration: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
  calendarId?: string;
  resources: ActivityResource[];
  predecessors: ActivityDependency[];
  successors: ActivityDependency[];
  constraints: ActivityConstraint[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityResource {
  id: string;
  activityId: string;
  type: 'labour' | 'equipment' | 'material';
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface ActivityDependency {
  id: string;
  fromActivityId: string;
  toActivityId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number; // days
}

export interface ActivityConstraint {
  id: string;
  activityId: string;
  type: 'ASAP' | 'ALAP' | 'MSO' | 'MFO' | 'SNET' | 'FNET';
  date: string;
}

export interface ScheduleCalendar {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  workingDays: number[]; // 0=Sunday, 6=Saturday
  workingHours: { start: string; end: string }[];
  exceptions: CalendarException[];
}

export interface CalendarException {
  id: string;
  calendarId: string;
  date: string;
  type: 'holiday' | 'working-day';
  name: string;
  workingHours?: { start: string; end: string }[];
}

export interface ScheduleBaseline {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  activities: ScheduleActivity[];
  projectStart: string;
  projectFinish: string;
  totalDuration: number;
  isCurrent: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CriticalPath {
  activities: string[]; // activity IDs
  totalDuration: number;
  projectFinish: string;
}

export interface ScheduleSummary {
  projectId: string;
  totalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  notStartedActivities: number;
  overallProgress: number;
  criticalPathDuration: number;
  projectFinish: string;
  baselineFinish: string;
  varianceDays: number;
  SPI: number; // Schedule Performance Index
  milestones: { id: string; name: string; date: string; status: string }[];
}
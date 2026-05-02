import { AppRoleKey, HouseholdTypeKey, PermissionKey } from "@/lib/access-control";

export type TaskSummary = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignedTo: string;
  assignedBy?: string;
  dueDate: string;
  dueAt?: string;
  notes?: string;
  requiresPhoto?: boolean;
  hasPhoto?: boolean;
  evidenceUrl?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  frequency?: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
};

export type ExpenseSummary = {
  id: string;
  title: string;
  amount: number;
  category: string;
  spentAt: string;
};

export type MealSummary = {
  id: string;
  day: string;
  type: string;
  title: string;
};

export type ShoppingSummary = {
  id: string;
  title: string;
  quantity: string;
  checked: boolean;
};

export type MemberSummary = {
  id: string;
  name: string;
  role: string;
  roleKey?: AppRoleKey;
  load: string;
  initials: string;
  color: "moss" | "gold" | "terra" | "sky";
};

export type AlertSummary = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "success" | "info";
  action?: string;
};

export type CalendarEvent = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  items: string[];
  isToday?: boolean;
  isoDate?: string;
};

export type TaskModuleData = {
  householdId: string;
  householdName: string;
  members: MemberSummary[];
  tasks: TaskSummary[];
  calendar: CalendarEvent[];
};

export type EmployeeTask = {
  id: string;
  title: string;
  instructions: string;
  status: "DONE" | "TODO";
  completedAt?: string;
  photoStatus: string;
  evidenceUrl?: string;
};

export type CategorySpend = {
  id: string;
  name: string;
  icon: string;
  amount: number;
  share: number;
  color: "moss" | "gold" | "terra" | "sky" | "ink";
};

export type SubscriptionSummary = {
  id: string;
  name: string;
  amount: number;
  renewsIn: string;
  status: "warning" | "ok";
};

export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  current: number;
  owners: string[];
  deadline: string;
};

export type AllowanceSummary = {
  id: string;
  childName: string;
  weeklyAmount: number;
  saved: number;
  available: number;
  streak: string;
};

export type BillSummary = {
  id: string;
  name: string;
  amount: number;
  dueLabel: string;
  status: "warning" | "ok";
};

export type FixedExpenseSummary = {
  id: string;
  name: string;
  amount: number;
  cadence: string;
  nextCharge: string;
};

export type DashboardData = {
  viewer: { name: string; role: string };
  household: {
    id: string;
    name: string;
    type?: HouseholdTypeKey;
    city: string;
    activeMembers: number;
    ownerName: string;
    dateLabel: string;
    score: number;
  };
  metrics: {
    openTasks: number;
    monthlySpend: number;
    completionRate: number;
    upcomingMeals: number;
    todayCompleted: number;
    todayTotal: number;
    budgetUsed: number;
  };
  members: MemberSummary[];
  tasks: TaskSummary[];
  expenses: ExpenseSummary[];
  meals: MealSummary[];
  shopping: ShoppingSummary[];
  alerts: AlertSummary[];
  calendar: CalendarEvent[];
  employee: {
    name: string;
    role: string;
    schedule: string;
    compliance: number;
    activeDays: number;
    todayProgress: string;
    clockIn: string;
    shiftProgress: string;
    tasks: EmployeeTask[];
  };
  finances: {
    monthLabel: string;
    budgetTotal: number;
    budgetUsed: number;
    fixedCosts: number;
    variableCosts: number;
    subscriptionsTotal: number;
    categories: CategorySpend[];
    subscriptions: SubscriptionSummary[];
    savingsGoals: SavingsGoal[];
    allowances: AllowanceSummary[];
    bills: BillSummary[];
    fixedExpenses: FixedExpenseSummary[];
  };
};

export type ProfileModuleData = {
  household: {
    id: string;
    name: string;
    type: HouseholdTypeKey;
    city: string;
    country: string;
    ownerName: string;
    ownerRole: string;
    ownerEmail: string;
    ownerPhone: string;
  };
  preferences: {
    weeklyDigestDay: string;
    weeklyDigestTime: string;
    paymentAlerts: boolean;
    evidenceAlerts: boolean;
    dailySummary: boolean;
  };
  members: MemberSummary[];
  invitations: InvitationSummary[];
  roleMatrix: Array<{
    role: AppRoleKey;
    label: string;
    entryView: string;
    inviteFlow: string;
    permissions: PermissionKey[];
  }>;
};

export type InvitationSummary = {
  id: string;
  role: string;
  roleKey: AppRoleKey;
  emailOrPhone: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  inviteLink: string;
};

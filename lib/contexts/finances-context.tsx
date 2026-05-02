import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNotifications } from "@/lib/contexts/notifications-context";
import type { SubscriptionSummary, FixedExpenseSummary, ExpenseSummary } from "@/lib/types";

export type RecurringPayment = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  category: string;
  kind: "subscription" | "fixed" | "service";
  notifyDaysBefore: number;
  active: boolean;
};

export type MonthRecord = {
  recurringId: string;
  year: number;
  month: number;
  status: "pending" | "paid" | "skipped";
  paidAt?: string;
};

export type NewRecurringPayload = {
  kind: "subscription" | "fixed" | "service";
  name: string;
  amount: number;
  dayOfMonth: number;
};

type FinancesCtx = {
  subscriptions: SubscriptionSummary[];
  fixedExpenses: FixedExpenseSummary[];
  expenses: ExpenseSummary[];
  budgetTotal: number;
  setSubscriptions: React.Dispatch<React.SetStateAction<SubscriptionSummary[]>>;
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpenseSummary[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseSummary[]>>;
  setBudgetTotal: React.Dispatch<React.SetStateAction<number>>;
  recurringPayments: RecurringPayment[];
  monthRecords: MonthRecord[];
  addRecurringPayment: (p: Omit<RecurringPayment, "id">) => void;
  updateRecurringPayment: (id: string, patch: Partial<Omit<RecurringPayment, "id">>) => void;
  deleteRecurringPayment: (id: string) => void;
  toggleRecurringPayment: (id: string) => void;
  markAsPaid: (recurringId: string, month: number, year: number) => void;
  skipPayment: (recurringId: string, month: number, year: number) => void;
  getMonthRecord: (recurringId: string, month: number, year: number) => MonthRecord | undefined;
  addRecurring: (payload: NewRecurringPayload) => void;
};

const FinancesContext = createContext<FinancesCtx | null>(null);

const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function buildRenewsIn(day: number): { renewsIn: string; status: "warning" | "ok" } {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), day);
  if (target <= today) target.setMonth(target.getMonth() + 1);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  const dateStr = `${day} ${MONTHS_SHORT[target.getMonth()]}`;
  const renewsIn =
    diff <= 0 ? `Vence hoy · ${dateStr}` :
    diff === 1 ? `Vence mañana · ${dateStr}` :
    `Vence en ${diff} días · ${dateStr}`;
  return { renewsIn, status: diff <= 3 ? "warning" : "ok" };
}

const STORAGE_KEYS = {
  subscriptions:      "noma-fin-subscriptions",
  fixedExpenses:      "noma-fin-fixed",
  expenses:           "noma-fin-expenses",
  recurringPayments:  "noma-fin-recurring",
  monthRecords:       "noma-fin-months",
  budgetTotal:        "noma-fin-budget",
};

export function FinancesProvider({
  initialSubscriptions = [],
  initialFixedExpenses = [],
  initialExpenses = [],
  initialBudgetTotal = 0,
  children,
}: {
  initialSubscriptions?: SubscriptionSummary[];
  initialFixedExpenses?: FixedExpenseSummary[];
  initialExpenses?: ExpenseSummary[];
  initialBudgetTotal?: number;
  children: ReactNode;
}) {
  const { addNotification } = useNotifications();
  const [subscriptions,     setSubscriptions]    = useState<SubscriptionSummary[]>(initialSubscriptions);
  const [fixedExpenses,     setFixedExpenses]    = useState<FixedExpenseSummary[]>(initialFixedExpenses);
  const [expenses,          setExpenses]         = useState<ExpenseSummary[]>(initialExpenses);
  const [budgetTotal,       setBudgetTotal]      = useState(initialBudgetTotal);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [monthRecords,      setMonthRecords]     = useState<MonthRecord[]>([]);
  const [hydrated,          setHydrated]         = useState(false);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const [subs, fixed, exps, recurring, months, budget] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.subscriptions),
        AsyncStorage.getItem(STORAGE_KEYS.fixedExpenses),
        AsyncStorage.getItem(STORAGE_KEYS.expenses),
        AsyncStorage.getItem(STORAGE_KEYS.recurringPayments),
        AsyncStorage.getItem(STORAGE_KEYS.monthRecords),
        AsyncStorage.getItem(STORAGE_KEYS.budgetTotal),
      ]);
      if (subs)      setSubscriptions(JSON.parse(subs));
      if (fixed)     setFixedExpenses(JSON.parse(fixed));
      if (exps)      setExpenses(JSON.parse(exps));
      if (recurring) setRecurringPayments(JSON.parse(recurring));
      if (months)    setMonthRecords(JSON.parse(months));
      if (budget)    setBudgetTotal(Number(budget));
      setHydrated(true);
    })();
  }, []);

  // Persist on change (after hydration)
  useEffect(() => { if (hydrated) AsyncStorage.setItem(STORAGE_KEYS.subscriptions,     JSON.stringify(subscriptions)); },     [subscriptions, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(STORAGE_KEYS.fixedExpenses,     JSON.stringify(fixedExpenses)); },     [fixedExpenses, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(STORAGE_KEYS.expenses,          JSON.stringify(expenses)); },          [expenses, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(STORAGE_KEYS.recurringPayments, JSON.stringify(recurringPayments)); }, [recurringPayments, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(STORAGE_KEYS.monthRecords,      JSON.stringify(monthRecords)); },      [monthRecords, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(STORAGE_KEYS.budgetTotal,       String(budgetTotal)); },               [budgetTotal, hydrated]);

  function addRecurringPayment(p: Omit<RecurringPayment, "id">) {
    setRecurringPayments((c) => [...c, { ...p, id: `rp-${Date.now()}` }]);
  }

  function updateRecurringPayment(id: string, patch: Partial<Omit<RecurringPayment, "id">>) {
    setRecurringPayments((c) => c.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deleteRecurringPayment(id: string) {
    setRecurringPayments((c) => c.filter((p) => p.id !== id));
    setMonthRecords((c) => c.filter((r) => r.recurringId !== id));
  }

  function toggleRecurringPayment(id: string) {
    setRecurringPayments((c) => c.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }

  function upsertRecord(recurringId: string, month: number, year: number, patch: Partial<MonthRecord>) {
    setMonthRecords((c) => {
      const existing = c.find((r) => r.recurringId === recurringId && r.month === month && r.year === year);
      if (existing) {
        return c.map((r) =>
          r.recurringId === recurringId && r.month === month && r.year === year ? { ...r, ...patch } : r
        );
      }
      return [...c, { recurringId, month, year, status: "pending", ...patch }];
    });
  }

  function markAsPaid(recurringId: string, month: number, year: number) {
    const payment = recurringPayments.find((p) => p.id === recurringId);
    if (!payment) return;
    const today = new Date().toISOString().slice(0, 10);
    setExpenses((c) => [{
      id: `exp-rp-${Date.now()}`,
      title: payment.name,
      amount: payment.amount,
      category: payment.category,
      spentAt: today,
    }, ...c]);
    addNotification({
      title: "Pago registrado",
      body: `${payment.name} · $${payment.amount.toLocaleString("es-CO")}`,
      href: "/(app)/finances",
      icon: "payment",
    });
    upsertRecord(recurringId, month, year, { status: "paid", paidAt: today });
  }

  function skipPayment(recurringId: string, month: number, year: number) {
    upsertRecord(recurringId, month, year, { status: "skipped" });
  }

  function getMonthRecord(recurringId: string, month: number, year: number) {
    return monthRecords.find((r) => r.recurringId === recurringId && r.month === month && r.year === year);
  }

  function addRecurring({ kind, name, amount, dayOfMonth }: NewRecurringPayload) {
    if (kind === "subscription") {
      const { renewsIn, status } = buildRenewsIn(dayOfMonth);
      setSubscriptions((c) => [...c, { id: `sub-${Date.now()}`, name, amount, renewsIn, status }]);
    } else {
      setFixedExpenses((c) => [...c, {
        id: `fixed-${Date.now()}`,
        name, amount,
        cadence: "Mensual",
        nextCharge: `${dayOfMonth} de cada mes`,
      }]);
    }
  }

  return (
    <FinancesContext.Provider value={{
      subscriptions, fixedExpenses, expenses, budgetTotal,
      setSubscriptions, setFixedExpenses, setExpenses, setBudgetTotal,
      recurringPayments, monthRecords,
      addRecurringPayment, updateRecurringPayment, deleteRecurringPayment, toggleRecurringPayment,
      markAsPaid, skipPayment, getMonthRecord,
      addRecurring,
    }}>
      {children}
    </FinancesContext.Provider>
  );
}

export function useFinances() {
  const ctx = useContext(FinancesContext);
  if (!ctx) throw new Error("useFinances must be used inside FinancesProvider");
  return ctx;
}

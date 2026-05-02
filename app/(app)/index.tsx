import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { AppHeader } from "@/components/shell/AppHeader";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { useSession } from "@/lib/contexts/session-context";
import { useFinances } from "@/lib/contexts/finances-context";
import { useNotifications } from "@/lib/contexts/notifications-context";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api/client";
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";
import type { DashboardData, TaskSummary, MemberSummary, ShoppingSummary } from "@/lib/types";

// ── Color maps ─────────────────────────────────────────────────────────────

const memberColorMap: Record<MemberSummary["color"], { bg: string; text: string; border: string }> = {
  moss:  { bg: "#0D7655", text: "#0D7655", border: "#0D7655" },
  gold:  { bg: "#f59e0b", text: "#92400e", border: "#f59e0b" },
  terra: { bg: "#f97316", text: "#9a3412", border: "#f97316" },
  sky:   { bg: "#0ea5e9", text: "#075985", border: "#0ea5e9" },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "¡Buenos días";
  if (h >= 12 && h < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

function getGreetingIcon() {
  const h = new Date().getHours();
  return h >= 5 && h < 19 ? "☀️" : "🌙";
}

function getHeroImage() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return require("@/assets/images/hero-house-day.webp");
  if (h >= 12 && h < 19) return require("@/assets/images/hero-house-afternoon.webp");
  return require("@/assets/images/hero-house-night.webp");
}


function getActivitySummary(tasks: TaskSummary[], members: MemberSummary[]) {
  const recentDone = [...tasks]
    .filter((t) => t.status === "DONE" && t.dueAt)
    .sort((a, b) => new Date(b.dueAt!).getTime() - new Date(a.dueAt!).getTime())[0];

  if (recentDone) {
    const first = recentDone.assignedTo.split(" ")[0];
    return {
      eyebrow: `${first} acaba de completar`,
      highlight: `${recentDone.title.toLowerCase()} 🎉`,
    };
  }

  const byPending = members
    .map((m) => ({ name: m.name.split(" ")[0], count: tasks.filter((t) => t.assignedTo === m.name && t.status !== "DONE").length }))
    .sort((a, b) => b.count - a.count)[0];

  if (byPending && byPending.count > 0) {
    return {
      eyebrow: `${byPending.name} tiene`,
      highlight: `${byPending.count} tarea${byPending.count > 1 ? "s" : ""} pendiente${byPending.count > 1 ? "s" : ""}`,
    };
  }

  return {
    eyebrow: "",
    highlight: "El hogar va al día",
  };
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function offsetIso(iso: string, offset: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function getDayLabel(offset: number): string {
  if (offset === 0) return "Hoy";
  if (offset === 1) return "Mañana";
  if (offset === -1) return "Ayer";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" });
}

// ── Ring component ──────────────────────────────────────────────────────────

function DailyRing({ pct, size = 148, strokeW = 14 }: { pct: number; size?: number; strokeW?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeW) / 2 - 4;
  const clampedPct = Math.min(Math.max(pct, 0), 100);

  // Build SVG arc path for the progress portion
  function describeArc(startAngle: number, endAngle: number): string {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const endAngle = (clampedPct / 100) * 360;
  const showArc = clampedPct > 0;
  // Full circle case needs special handling
  const isFullCircle = clampedPct >= 100;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke="#ECEDEB" strokeWidth={strokeW} />
        {/* Progress arc */}
        {showArc && (
          isFullCircle ? (
            <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke="#6C9A74" strokeWidth={strokeW} strokeLinecap="round" />
          ) : (
            <SvgPath d={describeArc(0, endAngle)} fill="none" stroke="#6C9A74" strokeWidth={strokeW} strokeLinecap="round" />
          )
        )}
      </Svg>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { expenses } = useFinances();
  const { addNotification } = useNotifications();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [shopping, setShopping] = useState<ShoppingSummary[]>([]);
  const [showRecentTasks, setShowRecentTasks] = useState(false);
  const [myTasksDayOffset, setMyTasksDayOffset] = useState(0);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: DashboardData } & Partial<DashboardData>>(
        "/api/dashboard",
        { token: session.token },
      );
      // API returns { ok, data: DashboardData } — unwrap; fall back if already flat
      const d: DashboardData = (raw as any).data ?? (raw as unknown as DashboardData);
      setData(d);
      setTasks(d.tasks ?? []);
      setShopping(d.shopping ?? []);
    } catch {}
    setLoading(false);
  }, [session?.token]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const todayIso = getTodayIso();
  const myTasksDayIso = offsetIso(todayIso, myTasksDayOffset);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueAt?.slice(0, 10) === todayIso),
    [tasks, todayIso]
  );

  const completedToday = todayTasks.filter((t) => t.status === "DONE").length;
  const pendingToday = todayTasks.filter((t) => t.status !== "DONE").length;
  const dailyProgress = todayTasks.length === 0 ? 0 : Math.round((completedToday / todayTasks.length) * 100);
  const finances = data?.finances;
  const viewer = data?.viewer;
  const members = data?.members ?? [];
  const meals = data?.meals ?? [];
  const financeBills = finances?.bills ?? [];
  const financeSubscriptions = finances?.subscriptions ?? [];
  const financeFixedExpenses = finances?.fixedExpenses ?? [];

  const financialAlertCount = useMemo(() => {
    return financeBills.filter((b) => b.status === "warning").length
         + financeSubscriptions.filter((s) => s.status === "warning").length;
  }, [financeBills, financeSubscriptions]);

  const recentTasks = useMemo(
    () => [...todayTasks].sort((a, b) => (b.dueAt ?? "").localeCompare(a.dueAt ?? "")).slice(0, 8),
    [todayTasks]
  );

  const todaySpanishDay = useMemo(() => {
    const d = new Date().getDay();
    return ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"][d] ?? "Lunes";
  }, []);

  const todayMeals = useMemo(
    // Match both legacy day-name format ("Lunes") and ISO date format ("2026-04-28")
    () => meals.filter((m) => m.day === todaySpanishDay || m.day === todayIso),
    [meals, todaySpanishDay, todayIso]
  );

  const shoppingPct = shopping.length
    ? Math.round((shopping.filter((s) => s.checked).length / shopping.length) * 100)
    : 0;

  const viewerFirstName = (viewer?.name ?? session?.name ?? "").split(" ")[0];
  const employeeTasks = data?.employee?.tasks ?? [];

  const myTasks = useMemo(
    () => tasks.filter((t) => {
      const matches = t.assignedTo.toLowerCase().includes(viewerFirstName.toLowerCase());
      const onDay = t.dueAt?.slice(0, 10) === myTasksDayIso;
      return matches && onDay;
    }).sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "")),
    [tasks, viewerFirstName, myTasksDayIso]
  );

  const memberContribs = useMemo(() => members.map((m) => {
    const mDone = todayTasks.filter((t) => t.assignedTo === m.name && t.status === "DONE").length;
    const mTotal = todayTasks.filter((t) => t.assignedTo === m.name).length;
    return { ...m, todayDone: mDone, todayTotal: mTotal };
  }), [members, todayTasks]);

  const maxDone = Math.max(...memberContribs.map((m) => m.todayDone), 0);
  const activitySummary = useMemo(() => getActivitySummary(tasks, members), [tasks, members]);

  const weeklyBudget = Math.round((finances?.budgetTotal ?? 0) / 4);
  const weeklySpent = expenses
    .filter((e) => {
      const d = new Date(e.spentAt);
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      return d >= monday;
    })
    .reduce((sum, e) => sum + e.amount, 0);
  const weeklyBudgetUsed = Math.min(Math.round((weeklySpent / Math.max(weeklyBudget, 1)) * 100), 100);

  const isOwner = session?.role === "OWNER";
  const showFinances = isOwner || (session?.canViewFinances ?? false);

  const hasEmployee = (session?.hasEmployee ?? false) || members.some((m) => m.roleKey === "DOMESTIC_HELP");
  const empMember = members.find((m) => m.roleKey === "DOMESTIC_HELP");
  const employee = data?.employee;
  const empFirstName = (employee?.name ?? "").split(" ")[0];
  const empClockedIn = !!(employee?.clockIn && employee.clockIn !== "-");
  const empProgressParts = (employee?.todayProgress ?? "0/0").split("/").map(Number);
  const empDone = empProgressParts[0] ?? 0;
  const empTotal = empProgressParts[1] ?? 0;
  const empProgressPct = empTotal > 0 ? Math.round((empDone / empTotal) * 100) : 0;

  const cobrosCount = financeBills.length + financeFixedExpenses.length + financeSubscriptions.length;

  const todayDateLabel = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long"
  }).replace(/^(\w)/, (c) => c.toUpperCase());
  async function handleTaskStatus(taskId: string, status: TaskSummary["status"]) {
    const taskTitle = tasks.find((t) => t.id === taskId)?.title ?? "";
    const previous = tasks;
    setTasks((c) => c.map((t) => t.id === taskId ? { ...t, status } : t));
    if (status === "DONE") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await apiFetch("/api/tasks", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({ taskId, status }),
      });
      if (status === "DONE" && taskTitle) {
        addNotification({
          title: "Tarea completada",
          body: taskTitle,
          href: "/(app)/tasks",
          icon: "task",
        });
      }
    } catch {
      setTasks(previous);
    }
  }

  async function handleShoppingToggle(itemId: string) {
    const current = shopping.find((s) => s.id === itemId);
    if (!current) return;
    const newChecked = !current.checked;
    setShopping((c) => c.map((s) => s.id === itemId ? { ...s, checked: newChecked } : s));
    try {
      await apiFetch("/api/meals", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({
          householdId: session?.householdId ?? "demo-household-1",
          itemId,
          checked: newChecked,
        }),
      });
    } catch {
      setShopping((c) => c.map((s) => s.id === itemId ? { ...s, checked: !newChecked } : s));
    }
  }

  const viewerInitials = (viewer?.name ?? session?.name ?? "")
    .split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  const { width: screenW } = useWindowDimensions();

  if (loading) {
    return (
      <View className="flex-1 bg-[#f5f0ea]">
        <AppHeader viewerInitials={viewerInitials} />
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonBox width={screenW - 32} height={140} borderRadius={28} />
          <SkeletonBox width={screenW - 32} height={200} borderRadius={28} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SkeletonBox width={(screenW - 44) / 2} height={80} borderRadius={20} />
            <SkeletonBox width={(screenW - 44) / 2} height={80} borderRadius={20} />
          </View>
          <SkeletonBox width={screenW - 32} height={160} borderRadius={28} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <AppHeader viewerInitials={viewerInitials} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7655" />}
      >
        {/* ── Hero ─────────────────────────────────────────── */}
        <View
          className="overflow-hidden rounded-[28px]"
          style={{ backgroundColor: "#0D7655", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            {/* Left text */}
            <View style={{ flex: 1, paddingBottom: 4, paddingRight: 8 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {todayDateLabel} · {new Date().getFullYear()}
              </Text>

              <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 18, lineHeight: 28, flexShrink: 0 }}>
                  {getGreetingIcon()}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 20,
                    fontWeight: "800",
                    lineHeight: 28,
                    letterSpacing: -0.5,
                    color: "white",
                  }}
                >
                  {getGreeting()},{" "}
                  <Text style={{ color: "#FF6A00" }}>{viewerFirstName || "NOMA"}!</Text>
                </Text>
              </View>

              <Text
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: "500",
                  lineHeight: 18,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {dailyProgress >= 80 ? "La casa está en calma hoy" : "Hay algunas cosas por atender"}
              </Text>
            </View>

            {/* House image — right, overflows downward */}
            <View style={{ width: 160, marginBottom: -20, marginRight: -16, flexShrink: 0 }}>
              <Image
                source={getHeroImage()}
                style={{ width: 160, height: 160 }}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* ── Ahora mismo ──────────────────────────────────── */}
        <View className="overflow-hidden rounded-[32px] bg-white" style={{ shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-6 pb-3">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Ahora mismo</Text>
              <Text className="mt-1 text-[13px] font-extrabold text-[#101111]">Lo que está pasando en casa</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full bg-[#E8F1EC] px-3.5 py-1.5">
              <View className="h-2 w-2 rounded-full bg-[#2E7D5A]" />
              <Text className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2E7D5A]">Live</Text>
            </View>
          </View>

          {/* Ring */}
          <TouchableOpacity
            onPress={() => setShowRecentTasks((v) => !v)}
            className="items-center pb-4"
            activeOpacity={0.7}
          >
            <View
              style={{
                position: "relative",
                width: 152,
                height: 152,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#7EA989",
                shadowOpacity: 0.14,
                shadowRadius: 26,
                shadowOffset: { width: 0, height: 14 },
              }}
            >
              <DailyRing pct={dailyProgress} size={152} strokeW={14} />
              <View style={{ position: "absolute" }} className="items-center">
                {todayTasks.length === 0 ? (
                  <>
                    <Text className="text-[1.9rem] font-black text-[#101111]">✓</Text>
                    <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-400">Al día</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-[1.9rem] font-black text-[#101111]">{dailyProgress}%</Text>
                    <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-400">Hoy</Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Activity banner */}
          <TouchableOpacity
            onPress={() => setShowRecentTasks((v) => !v)}
            className="mx-6 mb-5 flex-row items-center gap-4 rounded-[22px] bg-[#F5F2EC] px-4 py-4"
            activeOpacity={0.7}
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-full bg-white"
              style={{ shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            >
              <Text className="text-[14px] text-[#2E7D5A]">✦</Text>
            </View>
            <View className="flex-1 min-w-0">
              {activitySummary.eyebrow ? (
                <>
                  <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                    {activitySummary.eyebrow}
                  </Text>
                  <Text className="mt-0.5 text-[13px] font-extrabold text-[#101111]" numberOfLines={1}>
                    {activitySummary.highlight}
                  </Text>
                </>
              ) : (
                <Text className="text-[13px] font-semibold text-[#101111]" numberOfLines={2}>
                  {activitySummary.highlight}
                </Text>
              )}
            </View>
            <Text className="text-xl text-neutral-400">›</Text>
          </TouchableOpacity>

          {/* Expandable tasks */}
          {showRecentTasks && (
            <View className="mx-5 mb-4 overflow-hidden rounded-[18px] border border-black/[0.06]">
              <Text className="bg-[#f7f2ea]/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Tareas recientes
              </Text>
              {recentTasks.length === 0 ? (
                <Text className="px-4 py-5 text-sm text-neutral-400">Sin actividad hoy aún.</Text>
              ) : (
                recentTasks.map((task) => {
                  const isDone = task.status === "DONE";
                  const isInProgress = task.status === "IN_PROGRESS";
                  const assignee = memberContribs.find((m) => m.name === task.assignedTo);
                  const colors = assignee ? memberColorMap[assignee.color] : null;
                  return (
                    <View key={task.id} className="flex-row items-center gap-3 px-4 py-3 border-b border-black/[0.04]">
                      <View
                        className="h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors ? colors.bg + "1a" : "#f0f0f0" }}
                      >
                        <Text className="text-[10px] font-semibold" style={{ color: colors?.text ?? "#666" }}>
                          {assignee?.initials ?? task.assignedTo.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        className="flex-1 text-sm"
                        numberOfLines={1}
                        style={{ color: isDone ? "#a3a3a3" : "#101111", textDecorationLine: isDone ? "line-through" : "none" }}
                      >
                        {task.title}
                      </Text>
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          borderWidth: 2,
                          borderColor: isDone ? "transparent" : isInProgress ? "#6366F1" : "rgba(0,0,0,0.15)",
                          backgroundColor: isDone ? "#0D7655" : "transparent",
                        }}
                      >
                        {isDone && <Text className="text-white text-[8px]">✓</Text>}
                        {isInProgress && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#6366F1" }} />}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Divider */}
          <View className="mx-6 border-t border-black/[0.05]" />

          {/* Colaboración en casa */}
          <View className="px-6 pt-5 pb-4">
            <View className="items-center">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Colaboración en casa</Text>
              <TouchableOpacity onPress={() => setShowRecentTasks((v) => !v)}>
                <Text className="mt-2 text-[13px] text-neutral-400">{showRecentTasks ? "▲" : "▼"} Ver tareas recientes</Text>
              </TouchableOpacity>
            </View>
            <View className="mt-6 flex-row items-start justify-between px-1">
              {memberContribs.map((m) => {
                const isLeader = maxDone > 0 && m.todayDone === maxDone;
                const hasDone = m.todayDone > 0;
                const colors = memberColorMap[m.color];
                return (
                  <View key={m.id} className="items-center gap-2">
                    <View style={{ position: "relative" }}>
                      {isLeader && (
                        <Text style={{ position: "absolute", top: -16, left: "50%", marginLeft: -8, fontSize: 14 }}>👑</Text>
                      )}
                      <View
                        style={{
                          width: 72, height: 72,
                          borderRadius: 36,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: colors.bg + "1a",
                          borderWidth: 3,
                          borderColor: isLeader || hasDone ? colors.border : "transparent",
                          opacity: isLeader ? 1 : hasDone ? 0.7 : 0.5,
                        }}
                      >
                        <Text className="text-[14px] font-bold" style={{ color: colors.text }}>{m.initials}</Text>
                      </View>
                    </View>
                    <Text className="text-[12px] font-medium text-neutral-700">{m.name.split(" ")[0]}</Text>
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.bg + "1a" }}>
                      <Text className="text-[10px] font-bold" style={{ color: colors.text }}>
                        {m.todayDone}/{m.todayTotal > 0 ? m.todayTotal : "—"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Stats card ───────────────────────────────────── */}
        <View className="overflow-hidden rounded-[24px] bg-white flex-row" style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <TouchableOpacity onPress={() => router.push("/(app)/tasks")} className="flex-1 items-center gap-1.5 py-4" activeOpacity={0.7}>
            <Text className="text-xl font-bold text-[#101111]">{completedToday}</Text>
            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Listas hoy</Text>
          </TouchableOpacity>
          <View className="w-px self-stretch bg-black/[0.06]" />
          <TouchableOpacity onPress={() => router.push("/(app)/tasks")} className="flex-1 items-center gap-1.5 py-4" activeOpacity={0.7}>
            <Text className="text-xl font-bold text-[#101111]">{pendingToday}</Text>
            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Pendientes</Text>
          </TouchableOpacity>
          <View className="w-px self-stretch bg-black/[0.06]" />
          {showFinances ? (
            <TouchableOpacity onPress={() => router.push("/(app)/finances")} className="flex-1 items-center gap-1.5 py-4" activeOpacity={0.7}>
              <Text className="text-xl font-bold" style={{ color: financialAlertCount > 0 ? "#FF6A00" : "#101111" }}>
                {financialAlertCount}
              </Text>
              <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Alertas fin.</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-1 items-center gap-1.5 py-4">
              <Text className="text-xl font-bold text-[#101111]">{members.length}</Text>
              <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Miembros</Text>
            </View>
          )}
        </View>

        {/* ── Pulso financiero ─────────────────────────────── */}
        {showFinances && <TouchableOpacity
          onPress={() => router.push("/(app)/finances")}
          className="overflow-hidden rounded-[24px] bg-white p-5"
          activeOpacity={0.97}
          style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        >
          <View className="flex-row items-start gap-4">
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Pulso financiero</Text>
              <Text className="mt-1 text-xl font-bold text-[#101111]">{formatCurrency(finances?.budgetTotal ?? 0)}</Text>
              <Text className="mt-0.5 text-xs text-neutral-500">
                {formatCurrency(weeklySpent)} gastado esta semana · {weeklyBudgetUsed}% del presupuesto
              </Text>
              <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0ebe3]">
                <View
                  className={`h-full rounded-full`}
                  style={{
                    width: `${Math.min(weeklyBudgetUsed, 100)}%`,
                    backgroundColor: weeklyBudgetUsed > 100 ? "#FF6A00" : "#0D7655",
                  }}
                />
              </View>
              <Text className="mt-2 text-xs text-neutral-400">
                {weeklySpent > weeklyBudget
                  ? `${formatCurrency(weeklySpent - weeklyBudget)} por encima esta semana`
                  : `${formatCurrency(weeklyBudget - weeklySpent)} disponibles`}
              </Text>
            </View>

            {/* Cobros bubble */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/finances")}
              className="items-center gap-1"
              activeOpacity={0.7}
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0D7655]/10">
                <Text className="text-[14px] font-bold text-[#0D7655]">{cobrosCount}</Text>
              </View>
              <Text className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">cobros</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>}

        {/* ── Empleada del hogar ───────────────────────────── */}
        {isOwner && hasEmployee && data && employee && (
          <TouchableOpacity
            onPress={() => router.push("/(app)/employee")}
            className="overflow-hidden rounded-[28px] p-5"
            activeOpacity={0.97}
            style={{
              backgroundColor: "#0d3d2b",
              shadowColor: "#0D7655",
              shadowOpacity: 0.25,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {/* Header */}
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: empMember ? "rgba(154,52,18,0.6)" : "rgba(255,255,255,0.1)" }}
                >
                  <Text className="text-sm font-semibold" style={{ color: empMember ? "#fed7aa" : "rgba(255,255,255,0.6)" }}>
                    {empMember?.initials ?? empFirstName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Empleada del hogar
                  </Text>
                  <Text className="mt-0.5 text-base font-semibold text-white">{employee.name}</Text>
                  <Text className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{employee.schedule}</Text>
                </View>
              </View>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: empClockedIn ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)" }}
              >
                <Text
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: empClockedIn ? "#6ee7b7" : "rgba(255,255,255,0.3)" }}
                >
                  {empClockedIn ? "Activa" : "Sin registro"}
                </Text>
              </View>
            </View>

            {/* 3 stat chips */}
            <View className="mt-4 flex-row gap-2">
              {[
                { label: "Entrada", value: empClockedIn ? employee.clockIn : "—" },
                { label: "Jornada", value: empClockedIn ? (employee.shiftProgress.split("·")[0]?.replace("Lleva", "").trim() ?? "—") : "—" },
                { label: "Tareas", value: employee.todayProgress },
              ].map((chip) => (
                <View key={chip.label} className="flex-1 rounded-2xl p-3 items-center" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <Text className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{chip.label}</Text>
                  <Text className="mt-1 text-sm font-semibold" style={{ color: chip.label === "Tareas" && empProgressPct === 100 ? "#6ee7b7" : "white" }}>
                    {chip.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Progress bar */}
            <View className="mt-3">
              <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(empProgressPct, empTotal > 0 ? 4 : 0)}%`,
                    backgroundColor: empProgressPct === 100 ? "#6ee7b7" : "#c68f56",
                  }}
                />
              </View>
              <Text className="mt-1.5 text-right text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {empProgressPct === 100 ? "Todas las tareas completadas" : `${empProgressPct}% completado hoy`}
              </Text>
            </View>

            {/* Task list */}
            {employeeTasks.length > 0 && (
              <View className="mt-4 gap-1.5">
                {employeeTasks.slice(0, 4).map((t) => {
                  const isDone = t.status === "DONE";
                  return (
                    <View key={t.id} className="flex-row items-center gap-2.5">
                      <View
                        className="h-4 w-4 items-center justify-center rounded-full"
                        style={{
                          borderWidth: isDone ? 0 : 1,
                          borderColor: "rgba(255,255,255,0.2)",
                          backgroundColor: isDone ? "#6ee7b7" : "transparent",
                        }}
                      >
                        {isDone && <Text className="text-[8px] text-black">✓</Text>}
                      </View>
                      <Text
                        className="flex-1 text-xs"
                        numberOfLines={1}
                        style={{
                          color: isDone ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
                          textDecorationLine: isDone ? "line-through" : "none",
                        }}
                      >
                        {t.title}
                      </Text>
                      {t.completedAt && isDone && (
                        <Text className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{t.completedAt}</Text>
                      )}
                    </View>
                  );
                })}
                {employeeTasks.length > 4 && (
                  <Text className="pl-6 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    +{employeeTasks.length - 4} tareas más
                  </Text>
                )}
              </View>
            )}

            {/* Footer */}
            <View className="mt-4 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: "rgba(255,255,255,0.06)" }}>
              <Text className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Cumplimiento mensual: {data?.employee?.compliance ?? 0}%
              </Text>
              <Text className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Ver detalle →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Menú de hoy + Lista de mercado ───────────────── */}
        <View className="overflow-hidden rounded-[28px] bg-white" style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          {/* Meals header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Menú de hoy</Text>
              <Text className="mt-0.5 text-xs text-neutral-400">
                {todayMeals.length > 0
                  ? `${todayMeals.length} comida${todayMeals.length !== 1 ? "s" : ""} planeada${todayMeals.length !== 1 ? "s" : ""}`
                  : "Sin comidas planeadas"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(app)/menus")} className="rounded-full bg-[#0D7655]/10 px-3 py-1.5" activeOpacity={0.7}>
              <Text className="text-[11px] font-semibold text-[#0D7655]">Ver menús →</Text>
            </TouchableOpacity>
          </View>

          {/* Meal slots */}
          <View className="flex-row gap-2 px-5 pb-4">
            {(["Desayuno","Almuerzo","Cena"] as const).map((type) => {
              const meal = todayMeals.find((m) => m.type === type);
              const icons: Record<string, string> = { Desayuno: "☕", Almuerzo: "🌤", Cena: "🌙" };
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => router.push("/(app)/menus")}
                  className="flex-1 rounded-[18px] p-3"
                  activeOpacity={0.9}
                  style={meal
                    ? { backgroundColor: "rgba(13,118,85,0.07)", borderWidth: 1, borderColor: "rgba(13,118,85,0.1)" }
                    : { borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#fafaf8" }
                  }
                >
                  <Text className="text-xl leading-none">{icons[type]}</Text>
                  <View className="mt-2">
                    <Text className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">{type}</Text>
                    {meal ? (
                      <Text className="mt-1 text-[11px] font-semibold leading-snug text-[#101111]" numberOfLines={2}>{meal.title}</Text>
                    ) : (
                      <Text className="mt-1 text-[11px] font-medium" style={{ color: "rgba(13,118,85,0.5)" }}>+ Agregar</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Divider */}
          <View className="mx-5 border-t border-black/[0.05]" />

          {/* Shopping header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Lista de mercado</Text>
              {shopping.length > 0 && (
                <Text className="mt-0.5 text-[11px] text-neutral-400">
                  {shopping.filter((s) => s.checked).length} de {shopping.length} listos
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push("/(app)/menus")} className="rounded-full bg-[#0D7655]/10 px-3 py-1.5" activeOpacity={0.7}>
              <Text className="text-[11px] font-semibold text-[#0D7655]">Ver lista →</Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          {shopping.length > 0 && (
            <View className="mx-5 mb-3 h-1.5 overflow-hidden rounded-full bg-[#f0ebe3]">
              <View
                className="h-full rounded-full bg-[#0D7655]"
                style={{ width: `${Math.max(shoppingPct, shopping.length > 0 ? 3 : 0)}%` }}
              />
            </View>
          )}

          {/* Shopping items */}
          {shopping.length === 0 ? (
            <Text className="px-5 pb-5 text-sm text-neutral-400">Sin productos aún · agrega desde Menús</Text>
          ) : (
            <View className="px-5 pb-4">
              {shopping.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleShoppingToggle(item.id)}
                  className="flex-row items-center gap-3 rounded-[14px] px-1 py-2"
                  activeOpacity={0.7}
                >
                  <View
                    className="h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      borderWidth: 2,
                      borderColor: item.checked ? "#0D7655" : "rgba(0,0,0,0.2)",
                      backgroundColor: item.checked ? "#0D7655" : "transparent",
                    }}
                  >
                    {item.checked && <Text className="text-white text-[8px]">✓</Text>}
                  </View>
                  <Text
                    className="flex-1 text-sm"
                    style={{
                      color: item.checked ? "#a3a3a3" : "#101111",
                      textDecorationLine: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.quantity && (
                    <Text className="text-xs font-medium text-neutral-400">{item.quantity}</Text>
                  )}
                </TouchableOpacity>
              ))}
              {shopping.length > 5 && (
                <TouchableOpacity onPress={() => router.push("/(app)/menus")} activeOpacity={0.7}>
                  <Text className="pt-1 text-[11px] font-semibold text-[#0D7655]">
                    +{shopping.length - 5} más en la lista →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Mis tareas ────────────────────────────────────── */}
        <View className="overflow-hidden rounded-[28px] bg-white" style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Mis tareas</Text>
              <View className="mt-1 flex-row items-baseline gap-2">
                <Text className="text-base font-bold text-[#101111]">{viewerFirstName}</Text>
                {myTasks.length > 0 && (
                  <Text className="text-[11px] text-neutral-400">
                    {myTasks.filter((t) => t.status === "DONE").length}/{myTasks.length} completadas
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {/* Day nav */}
              <View className="flex-row items-center gap-0.5 rounded-full bg-[#f5f0ea] px-1 py-1">
                <TouchableOpacity
                  onPress={() => setMyTasksDayOffset((v) => v - 1)}
                  disabled={myTasksDayOffset <= -1}
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ opacity: myTasksDayOffset <= -1 ? 0.3 : 1 }}
                  activeOpacity={0.7}
                >
                  <Text className="text-neutral-500">‹</Text>
                </TouchableOpacity>
                <Text className="min-w-[60px] text-center text-[11px] font-bold text-[#101111]">
                  {getDayLabel(myTasksDayOffset)}
                </Text>
                <TouchableOpacity
                  onPress={() => setMyTasksDayOffset((v) => v + 1)}
                  disabled={myTasksDayOffset >= 6}
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ opacity: myTasksDayOffset >= 6 ? 0.3 : 1 }}
                  activeOpacity={0.7}
                >
                  <Text className="text-neutral-500">›</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(app)/tasks")}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#0D7655]/10"
                activeOpacity={0.7}
              >
                <Text className="text-[#0D7655]">→</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Task list */}
          <View className="px-4 pb-4">
            {myTasks.length === 0 ? (
              <View className="items-center rounded-[18px] border border-dashed border-black/[0.08] bg-[#fafaf8] py-8">
                <Text className="text-sm font-medium text-neutral-400">Sin tareas para este día</Text>
                <TouchableOpacity onPress={() => router.push("/(app)/tasks")} activeOpacity={0.7}>
                  <Text className="mt-2 text-[11px] font-semibold text-[#0D7655]">Ver todas las tareas →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-2">
                {myTasks.map((task) => {
                  const isDone = task.status === "DONE";
                  const isInProgress = task.status === "IN_PROGRESS";
                  const badgeBg = isDone ? "rgba(13,118,85,0.1)" : isInProgress ? "rgba(99,102,241,0.1)" : "rgba(255,106,0,0.1)";
                  const badgeColor = isDone ? "#0D7655" : isInProgress ? "#6366F1" : "#FF6A00";
                  const badgeLabel = isDone ? "Lista" : isInProgress ? "En curso" : "Pendiente";
                  return (
                    <View
                      key={task.id}
                      className="flex-row items-center gap-3 rounded-[16px] px-4 py-3"
                      style={isDone
                        ? { backgroundColor: "#f5f0ea" }
                        : {
                            borderWidth: 1,
                            borderColor: isInProgress ? "rgba(99,102,241,0.12)" : "rgba(13,118,85,0.08)",
                            backgroundColor: "white",
                            shadowColor: "#000",
                            shadowOpacity: 0.04,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 1 },
                            elevation: 1,
                          }
                      }
                    >
                      <TouchableOpacity
                        onPress={() => handleTaskStatus(task.id, isDone ? "TODO" : "DONE")}
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          borderWidth: 2,
                          borderColor: isDone ? "transparent" : isInProgress ? "#6366F1" : "rgba(0,0,0,0.15)",
                          backgroundColor: isDone ? "#0D7655" : isInProgress ? "rgba(99,102,241,0.15)" : "transparent",
                        }}
                        activeOpacity={0.7}
                      >
                        {isDone && <Text className="text-white text-[8px]">✓</Text>}
                        {isInProgress && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#6366F1" }} />}
                      </TouchableOpacity>
                      <View className="flex-1 min-w-0">
                        <Text
                          className="text-sm font-semibold"
                          numberOfLines={1}
                          style={{
                            color: isDone ? "#a3a3a3" : "#101111",
                            textDecorationLine: isDone ? "line-through" : "none",
                          }}
                        >
                          {task.title}
                        </Text>
                        {task.dueDate && (
                          <Text className="mt-0.5 text-[10px] text-neutral-400">{task.dueDate}</Text>
                        )}
                      </View>
                      <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: badgeBg }}>
                        <Text className="text-[10px] font-bold" style={{ color: badgeColor }}>
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

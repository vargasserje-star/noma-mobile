import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Modal,
  Animated,
} from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";

import { useSession } from "@/lib/contexts/session-context";
import { useAvatar, AVATAR_NOMA, AVATAR_COUNT } from "@/lib/contexts/avatar-context";
import { useNotifications, type AppNotification } from "@/lib/contexts/notifications-context";
import { apiFetch } from "@/lib/api/client";
import { postTaskEvent, fetchTaskEvents, statusLabel } from "@/lib/api/task-events";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";
import type { TaskSummary, MealSummary } from "@/lib/types";

const CLOCK_KEY = "noma-employee-clock";

type ClockState = {
  clockedIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  date: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function offsetIso(iso: string, offset: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function formatElapsed(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getDayLabel(iso: string) {
  const today = getTodayIso();
  const tomorrow = offsetIso(today, 1);
  if (iso === today) return "Hoy";
  if (iso === tomorrow) return "Mañana";
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" });
}

function getFullDateLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

function nextStatus(s: TaskSummary["status"]): TaskSummary["status"] {
  if (s === "TODO") return "IN_PROGRESS";
  if (s === "IN_PROGRESS") return "DONE";
  return "TODO";
}

// ── SVG Task icons ─────────────────────────────────────────────────────────────

function TaskIcon({ title, color, size = 20 }: { title: string; color: string; size?: number }) {
  const t = title.toLowerCase();
  if (/cocin|plato|vajilla|almuerz|desayun|cena|comida/.test(t)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 11l19-9-9 19-2-8-8-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (/limpi|baño|sanitario|ducha|barre|trapea|aspira|polvo/.test(t)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (/ropa|lavander|plancha|doblar/.test(t)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (/mercado|compra|tienda|super/.test(t)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={9} cy={21} r={1} stroke={color} strokeWidth={1.8} />
        <Circle cx={20} cy={21} r={1} stroke={color} strokeWidth={1.8} />
        <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (/jardín|plantas|regar/.test(t)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 22V12M12 12C12 12 7 10 7 5a5 5 0 0 1 5-5 5 5 0 0 1 5 5c0 5-5 7-5 7zM12 12c0 0-5 2-5 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  // default
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 11l3 3L22 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ dir, color, size = 16 }: { dir: "up" | "down"; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={dir === "up" ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MealTypeIcon({ type, color, size = 22 }: { type: string; color: string; size?: number }) {
  if (type === "Desayuno") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M17 8h1a4 4 0 0 1 0 8h-1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6 2v4M10 2v4M14 2v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (type === "Almuerzo") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 11l19-9-9 19-2-8-8-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  // Cena / default
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Notifications panel ────────────────────────────────────────────────────────

function NotificationIcon({ n }: { n: AppNotification }) {
  const icons: Record<string, string> = { task: "✓", payment: "$", expense: "↑", info: "i" };
  const colors: Record<string, string> = { task: "#0D7655", payment: "#FF6A00", expense: "#6366F1", info: "#64748b" };
  const icon = n.icon ?? "info";
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: (colors[icon] ?? "#64748b") + "1a", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: colors[icon] ?? "#64748b" }}>{icons[icon] ?? "i"}</Text>
    </View>
  );
}

// ── Avatar picker ──────────────────────────────────────────────────────────────

function AvatarPickerModal({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: number | null;
  onSelect: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Elige tu avatar</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: "#f0ebe3", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#737373" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => { onSelect(n); onClose(); }}
                style={{
                  width: 60, height: 60, borderRadius: 30,
                  borderWidth: current === n ? 3 : 2,
                  borderColor: current === n ? "#0D7655" : "rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
                activeOpacity={0.8}
              >
                <Image source={AVATAR_NOMA[n]!} style={{ width: 60, height: 60 }} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 20 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DomesticHomeScreen() {
  const { session, logout } = useSession();
  const { selectedAvatar, setSelectedAvatar: setAvatar } = useAvatar();
  const { notifications, unreadCount, markAllRead, addNotification } = useNotifications();
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState<ClockState>({
    clockedIn: false, clockInTime: null, clockOutTime: null, date: getTodayIso(),
  });
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(getTodayIso());
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [tick, setTick] = useState(Date.now());

  // Live timer tick
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadClock = useCallback(async () => {
    if (!session) return;
    const date = getTodayIso();
    const householdId = session.householdId ?? "demo-household-1";
    try {
      const raw = await apiFetch<{ ok: boolean; data: { clockedIn: boolean; clockInAt: string | null; clockOutAt: string | null } }>(
        `/api/employee-clock?householdId=${householdId}&date=${date}`,
        { token: session.token }
      );
      const entry = raw.data;
      setClock({
        date,
        clockedIn: entry.clockedIn,
        clockInTime: entry.clockInAt,
        clockOutTime: entry.clockOutAt,
      });
    } catch {
      // fallback: AsyncStorage
      const val = await AsyncStorage.getItem(CLOCK_KEY);
      if (!val) return;
      try {
        const saved: ClockState = JSON.parse(val);
        if (saved.date === date) setClock(saved);
      } catch {}
    }
  }, [session?.token, session?.householdId]);

  const loadTasks = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: { tasks?: TaskSummary[] } }>(
        "/api/tasks",
        { token: session.token }
      );
      const d = (raw as any).data ?? raw;
      const allTasks: TaskSummary[] = d.tasks ?? [];
      const firstName = session.name.split(" ")[0]?.toLowerCase() ?? "";
      setTasks(allTasks.filter((t) => t.assignedTo.toLowerCase().includes(firstName)));
    } catch {}
    setLoading(false);
  }, [session?.token, session?.name]);

  const loadMeals = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: { meals?: MealSummary[] } }>(
        "/api/meals",
        { token: session.token }
      );
      const d = (raw as any).data ?? raw;
      setMeals(d.meals ?? []);
    } catch {}
  }, [session?.token]);

  useEffect(() => { void loadClock(); void loadTasks(); void loadMeals(); }, [loadClock, loadTasks, loadMeals]);

  const loadEvents = useCallback(async () => {
    const events = await fetchTaskEvents({
      token: session?.token,
      householdId: session?.householdId ?? "demo-household-1",
      readerRole: "DOMESTIC_HELP",
      readerName: session?.name ?? "",
    });
    for (const ev of events) {
      if (ev.type === "TASK_DELEGATED") {
        addNotification({
          title: `${ev.fromName.split(" ")[0]} te asignó una tarea`,
          body: `"${ev.taskTitle}"`,
          href: "/(domestic)",
          icon: "task",
        });
      } else if (ev.type === "TASK_STATUS_CHANGED") {
        addNotification({
          title: "Tarea actualizada",
          body: `"${ev.taskTitle}" → ${statusLabel(ev.newStatus)}`,
          href: "/(domestic)",
          icon: "task",
        });
      }
    }
  }, [session?.token, session?.householdId, session?.name, addNotification]);

  useFocusEffect(useCallback(() => {
    void loadClock();
    void loadTasks();
    void loadMeals();
    void loadEvents();
  }, [loadClock, loadTasks, loadMeals, loadEvents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadClock(), loadTasks(), loadMeals()]);
    setRefreshing(false);
  }, [loadClock, loadTasks, loadMeals]);

  async function handleClock() {
    if (clockedOut) return;
    const action: "clock_in" | "clock_out" = clock.clockedIn ? "clock_out" : "clock_in";
    const now = new Date().toISOString();

    // Optimistic update
    const next: ClockState = action === "clock_in"
      ? { ...clock, clockedIn: true, clockInTime: now, clockOutTime: null }
      : { ...clock, clockedIn: false, clockOutTime: now };
    setClock(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Write to shared API
    try {
      const raw = await apiFetch<{ ok: boolean; data: { clockedIn: boolean; clockInAt: string | null; clockOutAt: string | null } }>(
        "/api/employee-clock",
        {
          method: "POST",
          token: session?.token,
          body: JSON.stringify({
            householdId: session?.householdId ?? "demo-household-1",
            action,
            date: getTodayIso(),
          }),
        }
      );
      // Reconcile with server response
      const entry = raw.data;
      setClock({
        date: getTodayIso(),
        clockedIn: entry.clockedIn,
        clockInTime: entry.clockInAt,
        clockOutTime: entry.clockOutAt,
      });
    } catch {
      // fallback: persist optimistic state to AsyncStorage
      await AsyncStorage.setItem(CLOCK_KEY, JSON.stringify(next));
    }
  }

  async function handleTaskStatus(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = nextStatus(task.status);
    const prev = tasks;
    setTasks((c) => c.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    if (newStatus === "DONE") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    addNotification({
      title: newStatus === "DONE" ? "Tarea completada" : "Tarea actualizada",
      body: `"${task.title}" → ${statusLabel(newStatus)}`,
      href: "/(domestic)",
      icon: "task",
    });

    try {
      await apiFetch("/api/tasks", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      // Notify the owner about this status change
      void postTaskEvent({
        token: session?.token,
        householdId: session?.householdId ?? "demo-household-1",
        type: "TASK_STATUS_CHANGED",
        taskId,
        taskTitle: task.title,
        fromName: session?.name ?? "Empleada",
        toRole: "OWNER",
        newStatus,
      });
    } catch { setTasks(prev); }
  }

  function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Estás segura que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => logout() },
    ]);
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const today = getTodayIso();

  // Normalize meal day: stored as ISO "2026-04-28" or Spanish name "Lunes"
  const SPANISH_DAYS: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
    jueves: 4, viernes: 5, sabado: 6, sábado: 6,
  };
  function mealDayToIso(day: string): string {
    const idx = SPANISH_DAYS[day.toLowerCase()];
    if (idx === undefined) return day; // already ISO
    const d = new Date(today + "T12:00:00Z");
    const currentDay = d.getUTCDay();
    const diff = (idx - currentDay + 7) % 7;
    return offsetIso(today, diff);
  }

  // Build day strip: today + 6 days, plus past days with tasks or meals
  const dayStrip = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i <= 6; i++) days.push(offsetIso(today, i));
    const pastWithContent = [
      ...tasks.filter((t) => t.dueAt && t.dueAt.slice(0, 10) < today).map((t) => t.dueAt!.slice(0, 10)),
    ].filter((d, i, arr) => arr.indexOf(d) === i && d < today).sort();
    return [...pastWithContent, ...days];
  }, [tasks, today]);

  // Meals for the selected day
  const mealsForDay = useMemo(() =>
    meals.filter((m) => mealDayToIso(m.day) === selectedDay),
    [meals, selectedDay]
  );

  const tasksForDay = useMemo(() =>
    tasks.filter((t) => {
      if (!t.dueAt) return selectedDay === today;
      return t.dueAt.slice(0, 10) === selectedDay;
    }),
    [tasks, selectedDay, today]
  );

  const doneTasks = tasksForDay.filter((t) => t.status === "DONE");
  const progressPct = tasksForDay.length > 0
    ? Math.round((doneTasks.length / tasksForDay.length) * 100)
    : 0;

  const todayTasks = useMemo(() =>
    tasks.filter((t) => !t.dueAt || t.dueAt.slice(0, 10) === today),
    [tasks, today]
  );
  const todayDone = todayTasks.filter((t) => t.status === "DONE").length;

  const firstName = (session?.name ?? "").split(" ")[0];
  const clockedOut = !!clock.clockOutTime && !clock.clockedIn;

  // Live elapsed time
  const elapsedMs = useMemo(() => {
    if (!clock.clockInTime) return 0;
    const end = clock.clockOutTime ? new Date(clock.clockOutTime).getTime() : tick;
    return Math.max(0, end - new Date(clock.clockInTime).getTime());
  }, [clock.clockInTime, clock.clockOutTime, tick]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0ea" }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 20,
        backgroundColor: "#0D7655",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "white", letterSpacing: -0.5 }}>NOMA</Text>
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1, letterSpacing: 1.5, textTransform: "uppercase" }}>Mi jornada</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Bell */}
          <TouchableOpacity
            onPress={() => { setShowNotifs(true); markAllRead(); }}
            style={{ position: "relative", padding: 6 }}
            activeOpacity={0.7}
          >
            <BellIcon color="rgba(255,255,255,0.8)" size={22} />
            {unreadCount > 0 && (
              <View style={{
                position: "absolute", top: 2, right: 2,
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: "#FF6A00",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1.5, borderColor: "#0D7655",
              }}>
                <Text style={{ fontSize: 9, fontWeight: "800", color: "white" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{ backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" }}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7655" />}
      >
        {/* ── Hero card ────────────────────────────────────────── */}
        <View style={{ backgroundColor: "#0d3d2b", borderRadius: 28, overflow: "hidden" }}>
          {/* Top section: avatar + greeting */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 20, paddingBottom: 0, gap: 14 }}>
            {/* Avatar — tappable */}
            <TouchableOpacity onPress={() => setShowAvatarPicker(true)} activeOpacity={0.8} style={{ position: "relative" }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderWidth: 2.5, borderColor: "rgba(255,255,255,0.2)",
                overflow: "hidden", alignItems: "center", justifyContent: "center",
              }}>
                {selectedAvatar ? (
                  <Image source={AVATAR_NOMA[selectedAvatar]!} style={{ width: 64, height: 64 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 22, fontWeight: "800", color: "white" }}>
                    {firstName.slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              {/* Edit badge */}
              <View style={{
                position: "absolute", bottom: 0, right: 0,
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: "#FF6A00", alignItems: "center", justifyContent: "center",
                borderWidth: 1.5, borderColor: "#0d3d2b",
              }}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                  <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
                  <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
                </Svg>
              </View>
            </TouchableOpacity>

            {/* Name + date */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
                {getFullDateLabel(today)}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 20, fontWeight: "800", color: "white", letterSpacing: -0.4 }}>
                {getGreeting()},{"\n"}
                <Text style={{ color: "#FF6A00" }}>{firstName}!</Text>
              </Text>
            </View>
          </View>

          {/* Cronómetro */}
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            {clock.clockInTime ? (
              <>
                <Text style={{
                  fontSize: 52, fontWeight: "800", color: "white",
                  letterSpacing: -1, fontVariant: ["tabular-nums"],
                }}>
                  {formatElapsed(elapsedMs)}
                </Text>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
                  {clockedOut ? "Jornada completada" : "Tiempo en jornada"}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 52, fontWeight: "800", color: "rgba(255,255,255,0.15)", letterSpacing: -1 }}>
                  00:00:00
                </Text>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
                  Ficha tu entrada para comenzar
                </Text>
              </>
            )}
          </View>

          {/* Stat chips row */}
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20 }}>
            {[
              { label: "Entrada", value: clock.clockInTime ? formatTime(clock.clockInTime) : "—" },
              { label: "Salida", value: clock.clockOutTime ? formatTime(clock.clockOutTime) : "—" },
              { label: "Tareas hoy", value: `${todayDone}/${todayTasks.length}` },
            ].map((chip) => (
              <View key={chip.label} style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 16, padding: 10, alignItems: "center",
              }}>
                <Text style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(255,255,255,0.35)" }}>
                  {chip.label}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 14, fontWeight: "700", color: "white" }}>
                  {chip.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          {todayTasks.length > 0 && (
            <View style={{ marginHorizontal: 20, marginTop: 14 }}>
              <View style={{ height: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <View style={{
                  height: "100%", borderRadius: 10,
                  backgroundColor: todayDone === todayTasks.length ? "#6ee7b7" : "#c68f56",
                  width: `${Math.max(Math.round(todayDone / todayTasks.length * 100), 3)}%`,
                }} />
              </View>
              <Text style={{ marginTop: 5, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>
                {todayDone === todayTasks.length ? "¡Todas las tareas listas!" : `${Math.round(todayDone / todayTasks.length * 100)}% completado`}
              </Text>
            </View>
          )}

          {/* CTA button */}
          <View style={{ padding: 20, paddingTop: 16 }}>
            {!clockedOut ? (
              <TouchableOpacity
                onPress={handleClock}
                style={{
                  borderRadius: 20,
                  paddingVertical: 15,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 10,
                  backgroundColor: clock.clockedIn ? "rgba(239,68,68,0.15)" : "#0D7655",
                  borderWidth: clock.clockedIn ? 1 : 0,
                  borderColor: "rgba(239,68,68,0.4)",
                }}
                activeOpacity={0.8}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  {clock.clockedIn ? (
                    <Rect x={4} y={4} width={16} height={16} rx={2} stroke="#fca5a5" strokeWidth={2} fill="#fca5a5" />
                  ) : (
                    <Path d="M5 3l14 9-14 9V3z" fill="white" stroke="white" strokeWidth={1.5} strokeLinejoin="round" />
                  )}
                </Svg>
                <Text style={{ fontSize: 15, fontWeight: "700", color: clock.clockedIn ? "#fca5a5" : "white" }}>
                  {clock.clockedIn ? "Fichar salida" : "Fichar entrada"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{
                borderRadius: 20, paddingVertical: 15,
                alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
                backgroundColor: "rgba(110,231,183,0.1)",
                borderWidth: 1, borderColor: "rgba(110,231,183,0.25)",
              }}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 6L9 17l-5-5" stroke="#6ee7b7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#6ee7b7" }}>Jornada completada</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Day selector ─────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {dayStrip.map((iso) => {
            const isSelected = iso === selectedDay;
            const isToday = iso === today;
            const dayTasks = tasks.filter((t) => (t.dueAt?.slice(0, 10) ?? today) === iso);
            const hasPending = dayTasks.some((t) => t.status !== "DONE");
            return (
              <TouchableOpacity
                key={iso}
                onPress={() => setSelectedDay(iso)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 20,
                  backgroundColor: isSelected ? "#0D7655" : "white",
                  borderWidth: 1,
                  borderColor: isSelected ? "#0D7655" : "rgba(0,0,0,0.07)",
                  alignItems: "center",
                  gap: 3,
                  shadowColor: "#000",
                  shadowOpacity: isSelected ? 0.15 : 0.04,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: isSelected ? 4 : 1,
                  minWidth: 64,
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: "700",
                  color: isSelected ? "white" : isToday ? "#0D7655" : "#737373",
                }}>
                  {getDayLabel(iso)}
                </Text>
                {dayTasks.length > 0 && (
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.6)"
                      : hasPending ? "#FF6A00" : "#0D7655",
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tasks card ───────────────────────────────────────── */}
        <View style={{
          backgroundColor: "white", borderRadius: 28,
          overflow: "hidden",
          shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 }, elevation: 2,
        }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>
                {selectedDay === today ? "Mis tareas de hoy" : `Tareas · ${getDayLabel(selectedDay)}`}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 13, fontWeight: "800", color: "#101111" }}>
                {tasksForDay.length === 0
                  ? "Sin tareas asignadas"
                  : `${doneTasks.length} de ${tasksForDay.length} completadas`}
              </Text>
            </View>
            {tasksForDay.length > 0 && (
              <View style={{
                backgroundColor: progressPct === 100 ? "rgba(13,118,85,0.1)" : "rgba(255,106,0,0.08)",
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
              }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: progressPct === 100 ? "#0D7655" : "#FF6A00" }}>
                  {progressPct}%
                </Text>
              </View>
            )}
          </View>

          {tasksForDay.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 44, paddingHorizontal: 20 }}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <Path d="M9 11l3 3L22 4" stroke="#d4d0c8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#d4d0c8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#a3a3a3", textAlign: "center" }}>
                Sin tareas para este día
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#c4c0b8", textAlign: "center" }}>
                El propietario asignará tareas aquí
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
              {tasksForDay.map((task) => {
                const isDone = task.status === "DONE";
                const isInProgress = task.status === "IN_PROGRESS";
                const isExpanded = expandedTask === task.id;

                const iconColor = isDone ? "#c4c0b8" : isInProgress ? "#6366F1" : "#0D7655";
                const badgeBg = isDone ? "rgba(13,118,85,0.08)" : isInProgress ? "rgba(99,102,241,0.1)" : "rgba(255,106,0,0.08)";
                const badgeColor = isDone ? "#0D7655" : isInProgress ? "#6366F1" : "#FF6A00";
                const badgeLabel = isDone ? "Lista" : isInProgress ? "En curso" : "Pendiente";

                return (
                  <View
                    key={task.id}
                    style={{
                      borderRadius: 20, borderWidth: 1,
                      borderColor: isDone ? "transparent" : isInProgress ? "rgba(99,102,241,0.18)" : "rgba(13,118,85,0.1)",
                      backgroundColor: isDone ? "#f7f5f0" : isInProgress ? "rgba(99,102,241,0.03)" : "white",
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setExpandedTask(isExpanded ? null : task.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                      activeOpacity={0.8}
                    >
                      {/* Status circle */}
                      <TouchableOpacity
                        onPress={() => handleTaskStatus(task.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 14,
                          borderWidth: 2,
                          borderColor: isDone ? "transparent" : isInProgress ? "#6366F1" : "rgba(0,0,0,0.18)",
                          backgroundColor: isDone ? "#0D7655" : isInProgress ? "rgba(99,102,241,0.12)" : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isDone && (
                          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                            <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                        )}
                        {isInProgress && (
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#6366F1" }} />
                        )}
                      </TouchableOpacity>

                      {/* SVG icon */}
                      <View style={{ opacity: isDone ? 0.4 : 1 }}>
                        <TaskIcon title={task.title} color={iconColor} size={20} />
                      </View>

                      {/* Title */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: 14, fontWeight: "600",
                            color: isDone ? "#a3a3a3" : "#101111",
                            textDecorationLine: isDone ? "line-through" : "none",
                          }}
                          numberOfLines={isExpanded ? undefined : 1}
                        >
                          {task.title}
                        </Text>
                        {task.assignedBy ? (
                          <Text style={{ marginTop: 2, fontSize: 10, color: "#a3a3a3" }}>
                            delegado por {task.assignedBy.split(" ")[0]}
                          </Text>
                        ) : task.dueAt ? (
                          <Text style={{ marginTop: 2, fontSize: 10, color: "#c4c0b8" }}>
                            {formatTime(task.dueAt)}
                          </Text>
                        ) : null}
                      </View>

                      {/* Badge */}
                      <View style={{ backgroundColor: badgeBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: badgeColor }}>{badgeLabel}</Text>
                      </View>

                      {/* Expand chevron */}
                      {task.notes && (
                        <ChevronIcon dir={isExpanded ? "up" : "down"} color="#c4c0b8" size={14} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && task.notes && (
                      <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 0 }}>
                        <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginBottom: 10 }} />
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#a3a3a3", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                          Instrucciones
                        </Text>
                        <Text style={{ fontSize: 13, lineHeight: 20, color: "#555" }}>{task.notes}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Menú del día ─────────────────────────────────────── */}
        <View style={{
          backgroundColor: "white", borderRadius: 28, overflow: "hidden",
          shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 }, elevation: 2,
        }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>
                Menú · {getDayLabel(selectedDay)}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 13, fontWeight: "800", color: "#101111" }}>
                {mealsForDay.length === 0 ? "Sin comidas planeadas" : `${mealsForDay.length} comida${mealsForDay.length !== 1 ? "s" : ""} programada${mealsForDay.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(13,118,85,0.08)", alignItems: "center", justifyContent: "center" }}>
              <MealTypeIcon type="Almuerzo" color="#0D7655" size={18} />
            </View>
          </View>

          {/* Meal slots */}
          <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
            {(["Desayuno", "Almuerzo", "Cena"] as const).map((type) => {
              const meal = mealsForDay.find((m) => m.type === type);
              const slotColors: Record<string, { bg: string; accent: string; label: string }> = {
                Desayuno: { bg: "#FFF7ED", accent: "#FF6A00", label: "Mañana" },
                Almuerzo: { bg: "#F0FDF4", accent: "#0D7655", label: "Mediodía" },
                Cena:     { bg: "#EFF6FF", accent: "#3B82F6", label: "Noche" },
              };
              const sc = slotColors[type]!;
              return (
                <View
                  key={type}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    padding: 12,
                    backgroundColor: meal ? sc.bg : "#fafaf8",
                    borderWidth: 1,
                    borderStyle: meal ? "solid" : "dashed",
                    borderColor: meal ? sc.accent + "30" : "rgba(0,0,0,0.08)",
                  }}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: meal ? sc.accent + "15" : "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center" }}>
                    <MealTypeIcon type={type} color={meal ? sc.accent : "#c4c0b8"} size={16} />
                  </View>
                  <Text style={{ marginTop: 8, fontSize: 9, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: meal ? sc.accent : "#c4c0b8" }}>
                    {sc.label}
                  </Text>
                  {meal ? (
                    <Text style={{ marginTop: 3, fontSize: 11, fontWeight: "600", color: "#101111", lineHeight: 15 }} numberOfLines={3}>
                      {meal.title}
                    </Text>
                  ) : (
                    <Text style={{ marginTop: 3, fontSize: 11, color: "#c4c0b8" }}>Sin planear</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Notes section if any meal has notes */}
          {mealsForDay.some((m) => (m as any).notes) && (
            <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 14, backgroundColor: "rgba(13,118,85,0.05)", padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#0D7655", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Notas del menú</Text>
              {mealsForDay.filter((m) => (m as any).notes).map((m) => (
                <Text key={m.id} style={{ fontSize: 12, color: "#555", lineHeight: 18 }}>
                  · {m.type}: {(m as any).notes}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* ── Dev role switcher (solo __DEV__) ─────────────────── */}
        <DevRoleSwitcher />
      </ScrollView>

      {/* ── Notifications modal ──────────────────────────────── */}
      <Modal visible={showNotifs} transparent animationType="slide" onRequestClose={() => setShowNotifs(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "75%", paddingTop: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#d4d0c8", alignSelf: "center", marginBottom: 16 }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#101111" }}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setShowNotifs(false)} style={{ backgroundColor: "#f0ebe3", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#737373" }}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <BellIcon color="#d4d0c8" size={36} />
                  <Text style={{ marginTop: 12, fontSize: 14, color: "#a3a3a3", fontWeight: "600" }}>Sin notificaciones</Text>
                </View>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <View
                    key={n.id}
                    style={{
                      flexDirection: "row", alignItems: "flex-start", gap: 12,
                      padding: 14, borderRadius: 18,
                      backgroundColor: n.read ? "#fafaf8" : "rgba(13,118,85,0.05)",
                      borderWidth: 1,
                      borderColor: n.read ? "transparent" : "rgba(13,118,85,0.1)",
                    }}
                  >
                    <NotificationIcon n={n} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111" }}>{n.title}</Text>
                      <Text style={{ fontSize: 12, color: "#737373", marginTop: 2, lineHeight: 17 }}>{n.body}</Text>
                      <Text style={{ fontSize: 10, color: "#c4c0b8", marginTop: 4 }}>
                        {new Date(n.timestamp).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Avatar picker modal ───────────────────────────────── */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        current={selectedAvatar}
        onSelect={setAvatar}
        onClose={() => setShowAvatarPicker(false)}
      />
    </View>
  );
}

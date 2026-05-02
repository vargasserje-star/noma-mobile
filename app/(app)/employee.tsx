import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { AppHeader } from "@/components/shell/AppHeader";
import { apiFetch } from "@/lib/api/client";
import { useNotifications } from "@/lib/contexts/notifications-context";
import { useSession } from "@/lib/contexts/session-context";
import { postTaskEvent, fetchTaskEvents, statusLabel } from "@/lib/api/task-events";
import type { DashboardData } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTask = {
  id: string;
  title: string;
  instructions: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  completedAt?: string;
  photoStatus: string;
  evidenceUrl?: string;
  frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
  dueAt?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  notes?: string;
};

type CalCell = { iso: string; num: number; inMonth: boolean; isToday: boolean };

const WEEKDAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] as const;
const CLOCK_KEY = "noma-employee-clock";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const assistantHero = require("@/assets/images/empleada-hero.webp");

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function shiftMonth(monthIso: string, offset: number) {
  const d = new Date(`${monthIso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function buildCalGrid(monthIso: string): CalCell[] {
  const start = new Date(`${monthIso}T12:00:00Z`);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const dow = start.getUTCDay();
  const firstWeekday = dow === 0 ? 6 : dow - 1;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const firstVisible = new Date(Date.UTC(year, month, 1 - firstWeekday));
  const today = getTodayIso();
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(firstVisible);
    d.setUTCDate(firstVisible.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { iso, num: d.getUTCDate(), inMonth: d.getUTCMonth() === month, isToday: iso === today };
  });
}

function formatMonthTitle(iso: string) {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" })
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

function formatFullDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

// ─── Task helpers ─────────────────────────────────────────────────────────────

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[:(),.-]/g, "").trim();
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function buildEmployeeTasks(data: DashboardData): ActiveTask[] {
  const employeeName = data.employee.name.split(" ")[0]?.toLowerCase() ?? "";
  const templateByTitle = new Map(data.employee.tasks.map((t) => [normalizeTitle(t.title), t]));
  const scoped = (data.tasks ?? [])
    .filter((t) => t.assignedTo.toLowerCase().includes(employeeName))
    .map((t) => {
      const template = templateByTitle.get(normalizeTitle(t.title));
      return {
        id: t.id,
        title: t.title,
        instructions: template?.instructions ?? t.notes ?? "",
        status: t.status,
        completedAt: template?.completedAt,
        photoStatus: template?.photoStatus ?? "No requiere foto",
        evidenceUrl: t.evidenceUrl ?? template?.evidenceUrl,
        frequency: (t.frequency ?? "ONCE") as ActiveTask["frequency"],
        dueAt: t.dueAt ?? undefined,
        priority: t.priority,
        notes: t.notes,
      } satisfies ActiveTask;
    });
  if (scoped.length > 0) return scoped;
  return (data.employee.tasks ?? []).map((t) => ({
    ...t,
    status: t.status as ActiveTask["status"],
    frequency: "ONCE" as const,
  }));
}

function nextStatus(current: ActiveTask["status"]): ActiveTask["status"] {
  if (current === "TODO") return "IN_PROGRESS";
  if (current === "IN_PROGRESS") return "DONE";
  return "TODO";
}

function complianceMessage(pct: number, firstName: string) {
  if (pct >= 85) return `¡Buen trabajo! ${firstName} está cumpliendo muy bien esta semana.`;
  if (pct >= 60) return `${firstName} va por buen camino, hay algunas tareas por cerrar.`;
  return `Hay varias tareas pendientes. Revisa la asignación con ${firstName}.`;
}

function getTaskEmoji(title: string) {
  const t = title.toLowerCase();
  if (/cocin|plato|vajilla|almuerz|desayun|cena|comida/.test(t)) return "🍽️";
  if (/limpi|baño|sanitario|ducha/.test(t)) return "🧹";
  if (/barre|trapea|aspira|polvo/.test(t)) return "🧹";
  if (/ropa|lavander|plancha/.test(t)) return "👕";
  if (/mercado|compra|tienda/.test(t)) return "🛒";
  return "✅";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function calcDuration(start: Date, end: Date) {
  const secs = Math.floor((end.getTime() - start.getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ─── Icons & mini components ──────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const size = 120;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const greenArc = circumference * Math.min(pct, 100) / 100;
  const orangeArc = circumference - greenArc;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8E1D8" strokeWidth={10} />
      {pct > 0 && (
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#0D7655" strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${greenArc * 0.65} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      {pct < 100 && (
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8892A" strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${orangeArc * 0.3} ${circumference}`}
          strokeDashoffset={-(greenArc * 0.65)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}

function StatusDot({ status, onPress }: { status: ActiveTask["status"]; onPress: () => void }) {
  if (status === "DONE") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#2E7B5E", alignItems: "center", justifyContent: "center" }}>
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path d="M2 6l3 3 5-5" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#65AEEA", backgroundColor: "rgba(101,174,234,0.12)", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#65AEEA" }} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#CCC7C0" }} />
  );
}

function MiniCalendar({
  selectedIso,
  pickerMonth,
  onSelectDate,
  onShiftMonth,
}: {
  selectedIso: string;
  pickerMonth: string;
  onSelectDate: (iso: string) => void;
  onShiftMonth: (offset: number) => void;
}) {
  const cells = useMemo(() => buildCalGrid(pickerMonth), [pickerMonth]);
  return (
    <View style={{ borderRadius: 18, backgroundColor: "white", overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 }}>
        <TouchableOpacity onPress={() => onShiftMonth(-1)} activeOpacity={0.8}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, color: "#666" }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatMonthTitle(pickerMonth)}</Text>
        <TouchableOpacity onPress={() => onShiftMonth(1)} activeOpacity={0.8}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, color: "#666" }}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
        {WEEKDAY_LABELS.map((l) => (
          <View key={l} style={{ flex: 1, paddingVertical: 5, alignItems: "center" }}>
            <Text style={{ fontSize: 8, fontWeight: "700", letterSpacing: 0.8, color: "#A7A39D" }}>{l}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingBottom: 6 }}>
        {cells.map((cell) => {
          const sel = selectedIso === cell.iso;
          return (
            <TouchableOpacity key={cell.iso} onPress={() => onSelectDate(cell.iso)} activeOpacity={0.8}
              style={{ width: "14.285%", paddingVertical: 3, alignItems: "center", opacity: cell.inMonth ? 1 : 0.28 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: sel ? "#0F5C4A" : cell.isToday ? "rgba(15,92,74,0.12)" : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 11, fontWeight: sel || cell.isToday ? "800" : "400", color: sel ? "white" : "#101111" }}>
                  {cell.num}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Task detail modal ────────────────────────────────────────────────────────

function TaskDetailModal({
  task,
  empInitials,
  visible,
  onClose,
  onToggle,
}: {
  task: ActiveTask | null;
  empInitials: string;
  visible: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
}) {
  if (!task) return null;

  const statusMeta = {
    TODO: { label: "Sin empezar", bg: "#F1EFEC", text: "#7F7C78", dot: "#A5A29E" },
    IN_PROGRESS: { label: "En curso", bg: "#DDECFB", text: "#3E76AE", dot: "#65AEEA" },
    DONE: { label: "Listo", bg: "#E6F1EB", text: "#2F7E5A", dot: "#2F7E5A" },
  };
  const meta = statusMeta[task.status];

  const priorityMeta: Record<string, { label: string; bg: string; text: string }> = {
    LOW: { label: "Baja", bg: "#E7F5ED", text: "#2F7E5A" },
    MEDIUM: { label: "Media", bg: "#FBF1D2", text: "#B98519" },
    HIGH: { label: "Alta", bg: "#FBE4E7", text: "#D24D63" },
  };

  const freqLabel: Record<string, string> = {
    ONCE: "Una vez", DAILY: "Diaria", WEEKLY: "Semanal", MONTHLY: "Mensual",
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Detalle de tarea</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 13, color: "#8E8880" }}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
          {/* Title */}
          <View style={{ borderRadius: 20, backgroundColor: "white", padding: 18, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#F0ECE8", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22 }}>{getTaskEmoji(task.title)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: task.status === "DONE" ? "#A7A39D" : "#101111", textDecorationLine: task.status === "DONE" ? "line-through" : "none" }}>
                  {task.title}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <View style={{ borderRadius: 999, backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.dot }} />
                    <Text style={{ fontSize: 10, fontWeight: "800", color: meta.text }}>{meta.label}</Text>
                  </View>
                  {task.priority && priorityMeta[task.priority] && (
                    <View style={{ borderRadius: 999, backgroundColor: priorityMeta[task.priority]!.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: priorityMeta[task.priority]!.text }}>{priorityMeta[task.priority]!.label}</Text>
                    </View>
                  )}
                  {task.frequency && task.frequency !== "ONCE" && (
                    <View style={{ borderRadius: 999, backgroundColor: "#EAF3EE", paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: "#2F7E5A" }}>{freqLabel[task.frequency]}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Instructions */}
          {!!task.instructions && (
            <View style={{ borderRadius: 20, backgroundColor: "white", padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A39D", marginBottom: 8 }}>Instrucciones</Text>
              <Text style={{ fontSize: 13, lineHeight: 20, color: "#555" }}>{task.instructions}</Text>
            </View>
          )}

          {/* Info grid */}
          <View style={{ borderRadius: 20, backgroundColor: "white", padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A39D" }}>Información</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: "#7F7C78" }}>Asignado a</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#D6EBE0", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#2E7B5E" }}>{empInitials}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>Asistente</Text>
              </View>
            </View>
            {task.dueAt && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#7F7C78" }}>Fecha</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>
                  {formatFullDate(task.dueAt.slice(0, 10))}
                </Text>
              </View>
            )}
            {task.completedAt && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#7F7C78" }}>Completada</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#2F7E5A" }}>
                  {new Date(task.completedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )}
          </View>

          {/* Action */}
          <TouchableOpacity
            onPress={() => { onToggle(task.id); onClose(); }}
            activeOpacity={0.85}
            style={{
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
              backgroundColor: task.status === "DONE" ? "#F3EEE8" : task.status === "IN_PROGRESS" ? "#2F7E5A" : "#3E76AE",
              shadowColor: task.status === "DONE" ? "transparent" : task.status === "IN_PROGRESS" ? "#2F7E5A" : "#3E76AE",
              shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: task.status === "DONE" ? "#7F7C78" : "white" }}>
              {task.status === "DONE" ? "Volver a pendiente" : task.status === "IN_PROGRESS" ? "Marcar como lista ✓" : "Marcar en curso →"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EmployeeScreen() {
  const router = useRouter();
  const { session, updateSession } = useSession();
  const { addNotification } = useNotifications();

  const todayIso = useMemo(() => getTodayIso(), []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ActiveTask | null>(null);

  // Clock state
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [clockOutTime, setClockOutTime] = useState<Date | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState("0:00:00");

  // Form state
  const [draft, setDraft] = useState({
    title: "",
    instructions: "",
    frequency: "ONCE" as "ONCE" | "DAILY" | "WEEKLY",
    dueDate: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
  });
  const [pickerMonth, setPickerMonth] = useState(startOfMonth(todayIso));
  const [pickerHour, setPickerHour] = useState(9);

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: DashboardData } & Partial<DashboardData>>(
        "/api/dashboard",
        { token: session.token },
      );
      const dashboard: DashboardData = (raw as any).data ?? (raw as unknown as DashboardData);
      setData(dashboard);
      setTasks(buildEmployeeTasks(dashboard));
    } catch {}
    setLoading(false);
  }, [session?.token]);

  // ── Clock — shared via API so OWNER and DOMESTIC_HELP stay in sync ───────────

  const loadClock = useCallback(async () => {
    if (!session) return;
    const householdId = session.householdId ?? "demo-household-1";
    const date = new Date().toISOString().slice(0, 10);
    try {
      const raw = await apiFetch<{ ok: boolean; data: { clockedIn: boolean; clockInAt: string | null; clockOutAt: string | null } }>(
        `/api/employee-clock?householdId=${householdId}&date=${date}`,
        { token: session.token }
      );
      const entry = raw.data;
      if (entry.clockInAt) setClockInTime(new Date(entry.clockInAt));
      if (entry.clockOutAt) setClockOutTime(new Date(entry.clockOutAt));
      setClockedIn(entry.clockedIn);
    } catch {
      // fallback: read from AsyncStorage
      const val = await AsyncStorage.getItem(CLOCK_KEY);
      if (!val) return;
      try {
        const { ci, cit, cot } = JSON.parse(val) as { ci: boolean; cit: string | null; cot: string | null };
        if (ci && cit) { setClockedIn(true); setClockInTime(new Date(cit)); }
        else if (cit && cot) { setClockInTime(new Date(cit)); setClockOutTime(new Date(cot)); }
      } catch {}
    }
  }, [session?.token, session?.householdId]);

  useEffect(() => { void loadClock(); }, [loadClock]);

  // ── Clock timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clockedIn || !clockInTime) return;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - clockInTime.getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsedDisplay(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(id);
  }, [clockedIn, clockInTime]);

  useEffect(() => { void loadData(); void loadClock(); }, [loadData, loadClock]);

  const loadEvents = useCallback(async () => {
    const events = await fetchTaskEvents({
      token: session?.token,
      householdId: session?.householdId ?? "demo-household-1",
      readerRole: "OWNER",
      readerName: session?.name ?? "",
    });
    for (const ev of events) {
      if (ev.type === "TASK_STATUS_CHANGED") {
        addNotification({
          title: `${ev.fromName.split(" ")[0]} actualizó una tarea`,
          body: `"${ev.taskTitle}" → ${statusLabel(ev.newStatus)}`,
          href: "/(app)/employee",
          icon: "task",
        });
      }
    }
  }, [session?.token, session?.householdId, session?.name, addNotification]);

  useFocusEffect(useCallback(() => {
    void loadData();
    void loadClock();
    void loadEvents();
  }, [loadData, loadClock, loadEvents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await loadClock();
    setRefreshing(false);
  }, [loadData, loadClock]);

  // ── Derived state ────────────────────────────────────────────────────────────

  const viewerInitials = (session?.name ?? "").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const emp = data?.employee;
  const empName = emp?.name ?? "Asistente";
  const empFirstName = empName.split(" ")[0] ?? empName;
  const empInitials = getInitials(empName);
  const allTasks = tasks;
  const pendingTasks = allTasks.filter((t) => t.status !== "DONE");
  const doneTasks = allTasks.filter((t) => t.status === "DONE");
  const inProgressTasks = allTasks.filter((t) => t.status === "IN_PROGRESS");
  const recurringTasks = allTasks.filter((t) => t.frequency !== "ONCE");

  const completionRate = useMemo(() => {
    const total = allTasks.length;
    if (total === 0) return emp?.compliance ?? 0;
    return Math.round((doneTasks.length / total) * 100);
  }, [allTasks.length, emp?.compliance, doneTasks.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleTaskToggle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = nextStatus(task.status);
    const snapshot = tasks;

    setTasks((cur) => cur.map((t) => t.id === taskId ? { ...t, status: next } : t));
    setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: next } : prev);

    if (next === "DONE") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({ title: "Tarea completada", body: task.title, href: "/(app)/employee", icon: "task" });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await apiFetch("/api/tasks", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({ taskId, status: next }),
      });
    } catch {
      setTasks(snapshot);
      setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: task.status } : prev);
    }
  }

  async function handleCreateTask() {
    if (!draft.title.trim()) return;
    const tempId = `temp-emp-${Date.now()}`;
    const newTask: ActiveTask = {
      id: tempId,
      title: draft.title.trim(),
      instructions: draft.instructions.trim(),
      status: "TODO",
      photoStatus: "No requiere foto",
      frequency: draft.frequency,
      dueAt: draft.dueDate || undefined,
      priority: draft.priority,
    };

    setTasks((cur) => [newTask, ...cur]);
    setShowAssignForm(false);
    addNotification({ title: "Tarea asignada", body: newTask.title, href: "/(app)/employee", icon: "task" });

    // Reset form
    setDraft({ title: "", instructions: "", frequency: "ONCE", dueDate: "", priority: "MEDIUM" });
    setPickerMonth(startOfMonth(todayIso));
    setPickerHour(9);

    try {
      const response = await apiFetch<{ data?: { id: string } }>("/api/tasks", {
        method: "POST",
        token: session?.token,
        body: JSON.stringify({
          householdId: data?.household?.id ?? "demo",
          title: draft.title.trim(),
          description: draft.instructions.trim(),
          assignedTo: empName,
          assignedBy: session?.name,
          dueDate: draft.dueDate || undefined,
          frequency: draft.frequency,
          priority: draft.priority,
        }),
      });
      if (response?.data?.id) {
        setTasks((cur) => cur.map((t) => t.id === tempId ? { ...t, id: response.data!.id! } : t));
        // Notify the employee about the new delegated task
        void postTaskEvent({
          token: session?.token,
          householdId: data?.household?.id ?? "demo-household-1",
          type: "TASK_DELEGATED",
          taskId: response.data.id,
          taskTitle: draft.title.trim(),
          fromName: session?.name ?? "Propietario",
          toRole: "DOMESTIC_HELP",
        });
      }
    } catch {}
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <AppHeader viewerInitials={viewerInitials} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0F5C4A" />
        </View>
      </View>
    );
  }

  if (session?.hasEmployee === false) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <AppHeader viewerInitials={viewerInitials} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}>
          {/* Illustration */}
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: "#E8F4EE",
            alignItems: "center", justifyContent: "center",
            marginBottom: 24,
          }}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#0D7655" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx={12} cy={7} r={4} stroke="#0D7655" strokeWidth={1.6} />
              <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#0D7655" strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          </View>

          <Text style={{ fontSize: 22, fontWeight: "800", color: "#101111", textAlign: "center", letterSpacing: -0.5 }}>
            Módulo de empleada
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#0D7655", textAlign: "center", letterSpacing: -0.5, marginBottom: 12 }}>
            no activado
          </Text>
          <Text style={{ fontSize: 14, color: "#A3A3A3", textAlign: "center", lineHeight: 21, fontWeight: "500", marginBottom: 32 }}>
            Activa este módulo para gestionar tareas, registrar horarios, pagos y el desempeño de tu empleada de hogar.
          </Text>

          {/* Feature chips */}
          <View style={{ gap: 10, width: "100%", marginBottom: 36 }}>
            {[
              { icon: "✓ Tareas y seguimiento", desc: "Asigna y revisa en tiempo real" },
              { icon: "✓ Control de horario", desc: "Entrada y salida sincronizada" },
              { icon: "✓ Gestión de pagos", desc: "Salarios y liquidaciones" },
            ].map((f) => (
              <View key={f.icon} style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                backgroundColor: "white", borderRadius: 18,
                paddingHorizontal: 18, paddingVertical: 14,
                shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D8EEE5", alignItems: "center", justifyContent: "center" }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#0D7655" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111" }}>{f.icon}</Text>
                  <Text style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/(app)/profile", params: { preselectRole: "DOMESTIC_HELP" } });
            }}
            style={{
              width: "100%", borderRadius: 20, paddingVertical: 17,
              backgroundColor: "#0D7655",
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
              shadowColor: "#0D7655", shadowOpacity: 0.35, shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 }, elevation: 6,
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx={9} cy={7} r={4} stroke="white" strokeWidth={2.2} />
              <Path d="M19 8v6M22 11h-6" stroke="white" strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              Agregar empleada doméstica
            </Text>
          </TouchableOpacity>

          <Text style={{ marginTop: 14, fontSize: 12, color: "#c4c0b8", fontWeight: "500", textAlign: "center" }}>
            Genera un código de invitación para que ella ingrese a Noma.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!emp) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <AppHeader viewerInitials={viewerInitials} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#101111", textAlign: "center" }}>Sin asistente del hogar</Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: "#A0A0A0", textAlign: "center" }}>Aún no tienes un asistente doméstico registrado.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
      <AppHeader viewerInitials={viewerInitials} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F5C4A" />}
      >
        {/* ── Hero card ── */}
        <View style={{
          overflow: "hidden", borderRadius: 30,
          backgroundColor: "#163D2E",
          shadowColor: "#0F5C4A", shadowOpacity: 0.2, shadowRadius: 26, shadowOffset: { width: 0, height: 8 }, elevation: 8,
        }}>
          {/* Top row: info left + image right */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 22 }}>
            {/* Left: text info */}
            <View style={{ flex: 1, paddingBottom: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
                Asistente del hogar
              </Text>

              <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ position: "relative" }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>{empInitials}</Text>
                  </View>
                  <View style={{ position: "absolute", bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: clockedIn ? "#67D3A0" : "#A0A0A0", borderWidth: 2, borderColor: "#163D2E" }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", lineHeight: 22, color: "white" }} numberOfLines={1}>{empName}</Text>
                  <Text style={{ marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{emp.role}</Text>
                </View>
              </View>

              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.10)" }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>{emp.schedule}</Text>
                </View>
                <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(103,211,160,0.18)" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#67D3A0" }}>{completionRate}% cumplimiento</Text>
                </View>
              </View>
            </View>

            {/* Right: hero image — constrained so it doesn't bleed over text */}
            <Image
              source={assistantHero}
              resizeMode="contain"
              style={{ width: 160, height: 200, marginBottom: 0, flexShrink: 0 }}
            />
          </View>
        </View>

        {/* ── Registro de jornada — solo lectura para el owner ── */}
        <View style={{ borderRadius: 28, backgroundColor: "white", paddingHorizontal: 20, paddingVertical: 18, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0F5C4A" }}>
              Registro de jornada
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(13,118,85,0.07)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: clockedIn ? "#0D7655" : "#d4d0c8" }} />
              <Text style={{ fontSize: 10, fontWeight: "700", color: clockedIn ? "#0D7655" : "#a3a3a3" }}>
                {clockedIn ? "En jornada" : clockOutTime ? "Jornada terminada" : "Sin fichar"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Entrada */}
            <View style={{ flex: 1, borderRadius: 18, backgroundColor: "#f7f5f0", padding: 14 }}>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#a3a3a3" }}>Entrada</Text>
              <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "800", color: clockInTime ? "#101111" : "#d4d0c8" }}>
                {clockInTime ? formatTime(clockInTime) : "—"}
              </Text>
            </View>

            {/* Salida */}
            <View style={{ flex: 1, borderRadius: 18, backgroundColor: "#f7f5f0", padding: 14 }}>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#a3a3a3" }}>Salida</Text>
              <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "800", color: clockOutTime ? "#101111" : "#d4d0c8" }}>
                {clockOutTime ? formatTime(clockOutTime) : clockedIn ? "…" : "—"}
              </Text>
            </View>

            {/* Duración */}
            <View style={{ flex: 1, borderRadius: 18, backgroundColor: clockedIn ? "rgba(13,118,85,0.07)" : "#f7f5f0", padding: 14 }}>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#a3a3a3" }}>
                {clockedIn ? "En curso" : "Total"}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "800", color: clockedIn ? "#0D7655" : clockInTime && clockOutTime ? "#101111" : "#d4d0c8" }}>
                {clockedIn && clockInTime
                  ? elapsedDisplay
                  : clockInTime && clockOutTime
                  ? calcDuration(clockInTime, clockOutTime)
                  : "—"}
              </Text>
            </View>
          </View>

          {/* Nota informativa */}
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 14, padding: 10 }}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={10} stroke="#a3a3a3" strokeWidth={1.8} />
              <Path d="M12 8v4M12 16h.01" stroke="#a3a3a3" strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            <Text style={{ flex: 1, fontSize: 11, color: "#a3a3a3", lineHeight: 16 }}>
              {empFirstName} registra su propia entrada y salida desde su app.
            </Text>
          </View>
        </View>

        {/* ── Tareas de la semana ── */}
        <View style={{ borderRadius: 30, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0F5C4A" }}>
                Tareas de {empFirstName}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: "#8D8D8D" }}>
                {doneTasks.length} listas · {inProgressTasks.length} en curso · {pendingTasks.filter(t => t.status === "TODO").length} pendientes
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowAssignForm(true)}
              style={{ borderRadius: 999, borderWidth: 1.5, borderColor: "#2E7B5E", paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#2E7B5E" }}>+ Asignar</Text>
            </TouchableOpacity>
          </View>

          {allTasks.length === 0 ? (
            <View style={{ alignItems: "center", paddingHorizontal: 20, paddingVertical: 32, paddingBottom: 28 }}>
              <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <Rect x={8} y={11} width={32} height={29} rx={9} fill="#DDEAE3" />
                <Rect x={14} y={18} width={20} height={16} rx={4} stroke="#7AA18F" strokeWidth={2.4} />
                <Path d="M14 23H34" stroke="#7AA18F" strokeWidth={2.4} strokeLinecap="round" />
                <Path d="M19 14V20M29 14V20" stroke="#7AA18F" strokeWidth={2.4} strokeLinecap="round" />
                <Circle cx={31} cy={31} r={6} fill="#3C8765" />
                <Path d="M28.5 31L30.4 32.9L33.6 29.7" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{ marginTop: 14, fontSize: 14, fontWeight: "700", color: "#101111" }}>Sin tareas activas</Text>
              <Text style={{ marginTop: 6, textAlign: "center", fontSize: 12, lineHeight: 18, color: "#8D8D8D" }}>
                Todo al día. Usa "+ Asignar" para añadir una tarea.
              </Text>
            </View>
          ) : (
            allTasks.map((task, index) => {
              const done = task.status === "DONE";
              const inProgress = task.status === "IN_PROGRESS";
              return (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => setSelectedTask(task)}
                  activeOpacity={0.82}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 20, paddingVertical: 15,
                    borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "rgba(0,0,0,0.05)",
                    opacity: done ? 0.72 : 1,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: done ? "#F0ECE8" : inProgress ? "rgba(101,174,234,0.1)" : "#F1ECE5", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Text style={{ fontSize: 20, opacity: done ? 0.5 : 1 }}>{getTaskEmoji(task.title)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: done ? "#9A9A9A" : "#101111", textDecorationLine: done ? "line-through" : "none" }}>
                      {task.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {task.frequency !== "ONCE" && (
                        <Text style={{ fontSize: 11, color: "#2E7B5E", fontWeight: "600" }}>
                          {task.frequency === "DAILY" ? "Diaria" : task.frequency === "WEEKLY" ? "Semanal" : "Mensual"}
                        </Text>
                      )}
                      {task.dueAt && (
                        <Text style={{ fontSize: 11, color: "#A7A39D" }}>
                          {new Date(`${task.dueAt.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <StatusDot status={task.status} onPress={() => handleTaskToggle(task.id)} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Ritmo de cumplimiento ── */}
        <View style={{ borderRadius: 30, backgroundColor: "white", paddingHorizontal: 20, paddingVertical: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0F5C4A" }}>Ritmo de cumplimiento</Text>
            <View style={{ borderRadius: 999, backgroundColor: "#F2ECE5", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#8C857F" }}>Esta semana</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1, borderRadius: 18, backgroundColor: "#F4EEE8", paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A958F" }}>Asistencia</Text>
              <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "800", color: "#101111" }}>{emp.activeDays}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: "#7F7F7F" }}>días</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <View style={{ position: "relative" }}>
                <ProgressRing pct={completionRate} />
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: "#101111" }}>{completionRate}%</Text>
                </View>
              </View>
              <Text style={{ marginTop: 6, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A958F" }}>Cumplimiento</Text>
            </View>

            <View style={{ flex: 1, borderRadius: 18, backgroundColor: "#F4EEE8", paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A958F" }}>Tareas</Text>
              <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "800", color: "#101111" }}>{doneTasks.length}/{allTasks.length}</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: "#7F7F7F" }}>resueltas</Text>
            </View>
          </View>

          {allTasks.length > 0 && (
            <>
              {/* Progress bar */}
              <View style={{ marginTop: 16, height: 8, borderRadius: 4, backgroundColor: "#F0EBE5", overflow: "hidden" }}>
                <View style={{ height: "100%", borderRadius: 4, backgroundColor: "#0D7655", width: `${Math.max(completionRate, 3)}%` }} />
              </View>
              {/* Sub-bar: in progress */}
              {inProgressTasks.length > 0 && (
                <View style={{ marginTop: 4, height: 4, borderRadius: 2, backgroundColor: "#F0EBE5", overflow: "hidden" }}>
                  <View style={{ height: "100%", borderRadius: 2, backgroundColor: "#65AEEA", width: `${Math.max(Math.round((inProgressTasks.length / allTasks.length) * 100), 3)}%` }} />
                </View>
              )}
              <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                <Text style={{ fontSize: 11, color: "#2E7B5E", fontWeight: "600" }}>{doneTasks.length} completadas</Text>
                {inProgressTasks.length > 0 && <Text style={{ fontSize: 11, color: "#65AEEA", fontWeight: "600" }}>{inProgressTasks.length} en curso</Text>}
                <Text style={{ fontSize: 11, color: "#8D8D8D" }}>{pendingTasks.filter(t => t.status === "TODO").length} pendientes</Text>
              </View>
            </>
          )}

          <Text style={{ marginTop: 14, fontSize: 13, lineHeight: 20, color: "#5A5A5A" }}>
            {complianceMessage(completionRate, empFirstName)}
          </Text>

          {/* Recurring summary */}
          {recurringTasks.length > 0 && (
            <View style={{ marginTop: 14, borderRadius: 14, backgroundColor: "#EAF3ED", paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🔁</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#2E7B5E" }}>{recurringTasks.length} tarea{recurringTasks.length !== 1 ? "s" : ""} recurrente{recurringTasks.length !== 1 ? "s" : ""}</Text>
                <Text style={{ fontSize: 11, color: "#5A9A76" }}>Se renuevan automáticamente según su frecuencia.</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Task detail modal ── */}
      <TaskDetailModal
        task={selectedTask}
        empInitials={empInitials}
        visible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onToggle={handleTaskToggle}
      />

      {/* ── Assign task modal ── */}
      <Modal visible={showAssignForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAssignForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0F5C4A" }}>Asignación</Text>
              <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "800", color: "#101111" }}>Nueva tarea para {empFirstName}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAssignForm(false)} style={{ borderRadius: 999, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 18, paddingTop: 20, paddingBottom: 40 }}>

              {/* Título */}
              <TextInput
                value={draft.title}
                onChangeText={(title) => setDraft((c) => ({ ...c, title }))}
                placeholder="Ej. Organizar alacena, Lavar ropa..."
                placeholderTextColor="#B0B0B0"
                autoFocus
                style={{ borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, fontWeight: "600", color: "#101111", backgroundColor: "#EDE8E2" }}
              />

              {/* Instrucciones */}
              <View>
                <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0F5C4A" }}>
                  Instrucciones <Text style={{ textTransform: "none", fontWeight: "400", color: "#A0A0A0" }}>(opcional)</Text>
                </Text>
                <TextInput
                  value={draft.instructions}
                  onChangeText={(instructions) => setDraft((c) => ({ ...c, instructions }))}
                  placeholder="Lugar, insumos necesarios, pasos..."
                  placeholderTextColor="#B0B0B0"
                  multiline
                  textAlignVertical="top"
                  style={{ borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 13, color: "#101111", backgroundColor: "#EDE8E2", minHeight: 88 }}
                />
              </View>

              {/* Fecha — mini calendar */}
              <View>
                <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0F5C4A" }}>Fecha</Text>
                <MiniCalendar
                  selectedIso={draft.dueDate.slice(0, 10)}
                  pickerMonth={pickerMonth}
                  onSelectDate={(iso) => {
                    setDraft((c) => ({ ...c, dueDate: `${iso}T${String(pickerHour).padStart(2, "0")}:00` }));
                  }}
                  onShiftMonth={(offset) => setPickerMonth(shiftMonth(pickerMonth, offset))}
                />
                {/* Hour chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, paddingBottom: 2 }}>
                    {[{ label: "8am", hour: 8 }, { label: "9am", hour: 9 }, { label: "12pm", hour: 12 }, { label: "2pm", hour: 14 }, { label: "6pm", hour: 18 }].map((opt) => {
                      const active = pickerHour === opt.hour;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          onPress={() => {
                            setPickerHour(opt.hour);
                            const currentDate = draft.dueDate.slice(0, 10) || todayIso;
                            setDraft((c) => ({ ...c, dueDate: `${currentDate}T${String(opt.hour).padStart(2, "0")}:00` }));
                          }}
                          activeOpacity={0.85}
                          style={{ borderRadius: 999, borderWidth: 1, borderColor: active ? "#0F5C4A" : "rgba(0,0,0,0.08)", backgroundColor: active ? "#D8EEE5" : "white", paddingHorizontal: 14, paddingVertical: 9 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#0F5C4A" : "#6B6B6B" }}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {draft.dueDate && (
                      <TouchableOpacity
                        onPress={() => setDraft((c) => ({ ...c, dueDate: "" }))}
                        activeOpacity={0.85}
                        style={{ borderRadius: 999, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#F3EEE8", paddingHorizontal: 14, paddingVertical: 9 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#A07060" }}>Sin fecha</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
                {draft.dueDate.slice(0, 10) && (
                  <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: "rgba(15,92,74,0.08)", paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F5C4A" }}>
                      {formatFullDate(draft.dueDate.slice(0, 10))}
                      {draft.dueDate.length > 10 ? ` · ${draft.dueDate.slice(11, 16)}` : ""}
                    </Text>
                  </View>
                )}
              </View>

              {/* Frecuencia */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0F5C4A" }}>Frecuencia</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[{ key: "ONCE", label: "Una vez" }, { key: "DAILY", label: "Diaria" }, { key: "WEEKLY", label: "Semanal" }].map((opt) => {
                    const active = draft.frequency === opt.key;
                    return (
                      <TouchableOpacity key={opt.key} activeOpacity={0.85}
                        onPress={() => setDraft((c) => ({ ...c, frequency: opt.key as typeof c.frequency }))}
                        style={{ flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center", backgroundColor: active ? "#0F5C4A" : "#EDE8E2" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#6B6B6B" }}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Prioridad */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0F5C4A" }}>Prioridad</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    { key: "LOW", label: "Baja", activeBg: "#F5F0E8", activeColor: "#8A7F6E" },
                    { key: "MEDIUM", label: "Media", activeBg: "#FFF8D6", activeColor: "#9A7A22" },
                    { key: "HIGH", label: "Alta", activeBg: "#FDECEA", activeColor: "#C0392B" },
                  ].map((opt) => {
                    const active = draft.priority === opt.key;
                    return (
                      <TouchableOpacity key={opt.key} activeOpacity={0.85}
                        onPress={() => setDraft((c) => ({ ...c, priority: opt.key as typeof c.priority }))}
                        style={{ flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center", backgroundColor: active ? opt.activeBg : "#EDE8E2" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? opt.activeColor : "#6B6B6B" }}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCreateTask}
                disabled={!draft.title.trim()}
                style={{
                  borderRadius: 999, paddingVertical: 16, alignItems: "center",
                  backgroundColor: "#F97920", opacity: !draft.title.trim() ? 0.6 : 1,
                  shadowColor: "#F97920", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>Asignar tarea a {empFirstName}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

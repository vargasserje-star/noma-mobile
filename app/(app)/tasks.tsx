import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { AppHeader } from "@/components/shell/AppHeader";
import { useSession } from "@/lib/contexts/session-context";
import { useNotifications } from "@/lib/contexts/notifications-context";
import { apiFetch } from "@/lib/api/client";
import { postTaskEvent, fetchTaskEvents, statusLabel } from "@/lib/api/task-events";
import type { DashboardData, MemberSummary, TaskSummary } from "@/lib/types";

type ViewMode = "month" | "day" | "list";
type ListStatusFilter = "ALL" | "TODO" | "IN_PROGRESS" | "DONE";

type CreateDraft = {
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
  notes: string;
};

const memberColorMap: Record<MemberSummary["color"], { bg: string; text: string }> = {
  moss: { bg: "#E5F1EB", text: "#2F7E5A" },
  gold: { bg: "#FBF1D2", text: "#A67B1B" },
  terra: { bg: "#FBE5DB", text: "#C46A2C" },
  sky: { bg: "#E5F1FB", text: "#5C93D8" },
};

const statusMeta = {
  TODO: { label: "Sin empezar", bg: "#F1EFEC", text: "#7F7C78", dot: "#A5A29E" },
  IN_PROGRESS: { label: "En curso", bg: "#DDECFB", text: "#3E76AE", dot: "#65AEEA" },
  DONE: { label: "Listo", bg: "#E6F1EB", text: "#2F7E5A", dot: "#2F7E5A" },
} as const;

const priorityMeta = {
  LOW: { label: "Baja", bg: "#E7F5ED", text: "#2F7E5A", dot: "#A7A39D" },
  MEDIUM: { label: "Media", bg: "#FBF1D2", text: "#B98519", dot: "#F4A521" },
  HIGH: { label: "Alta", bg: "#FBE4E7", text: "#D24D63", dot: "#D24D63" },
} as const;

const frequencyLabel: Record<NonNullable<TaskSummary["frequency"]>, string> = {
  ONCE: "Una vez",
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
};

const weekdayLabels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

type CalendarDay = {
  id: string;
  isoDate: string;
  dateNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  tasks: TaskSummary[];
  pendingCount: number;
  doneCount: number;
};

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getTaskIsoDate(task: TaskSummary) {
  return task.dueAt?.slice(0, 10) ?? task.dueDate;
}

function startOfMonth(isoDate: string) {
  return `${isoDate.slice(0, 7)}-01`;
}

function shiftMonth(monthIso: string, offset: number) {
  const date = new Date(`${monthIso}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function shiftIsoDay(isoDate: string, offset: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function formatMonthTitle(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).replace(/^(\w)/, (c) => c.toUpperCase());
}

function formatSelectedDay(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).replace(/^(\w)/, (c) => c.toUpperCase());
}

function formatShortMonth(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("es-CO", {
    month: "short",
    timeZone: "UTC",
  }).replace(".", "");
}

function buildMonthGrid(monthIso: string, tasks: TaskSummary[]): CalendarDay[] {
  const monthStart = new Date(`${monthIso}T12:00:00Z`);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const firstWeekday = (() => {
    const d = monthStart.getUTCDay();
    return d === 0 ? 6 : d - 1;
  })();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const firstVisible = new Date(Date.UTC(year, month, 1 - firstWeekday));
  const today = getTodayIso();

  return Array.from({ length: totalCells }, (_, index) => {
    const current = new Date(firstVisible);
    current.setUTCDate(firstVisible.getUTCDate() + index);
    const isoDate = current.toISOString().slice(0, 10);
    const dayTasks = tasks.filter((task) => getTaskIsoDate(task) === isoDate);
    return {
      id: isoDate,
      isoDate,
      dateNumber: current.getUTCDate(),
      inCurrentMonth: current.getUTCMonth() === month,
      isToday: isoDate === today,
      tasks: dayTasks,
      pendingCount: dayTasks.filter((task) => task.status !== "DONE").length,
      doneCount: dayTasks.filter((task) => task.status === "DONE").length,
    };
  });
}

function buildQuickDate(isoDate: string, hour: number) {
  return `${isoDate}T${String(hour).padStart(2, "0")}:00`;
}

function formatTimeOnly(value: string | undefined) {
  if (!value) return "";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function nextStatus(current: TaskSummary["status"]): TaskSummary["status"] {
  if (current === "TODO") return "IN_PROGRESS";
  if (current === "IN_PROGRESS") return "DONE";
  return "TODO";
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarTabIcon({ kind, active }: { kind: ViewMode; active: boolean }) {
  const color = active ? "white" : "#A9A39D";
  if (kind === "month") {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect x={2} y={3} width={16} height={15} rx={3} stroke={color} strokeWidth={1.8} />
        <Line x1={6} y1={1.5} x2={6} y2={5.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={14} y1={1.5} x2={14} y2={5.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={2} y1={8} x2={18} y2={8} stroke={color} strokeWidth={1.8} />
      </Svg>
    );
  }
  if (kind === "day") {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect x={2} y={3} width={16} height={15} rx={3} stroke={color} strokeWidth={1.8} />
        <Line x1={6} y1={1.5} x2={6} y2={5.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={14} y1={1.5} x2={14} y2={5.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={2} y1={8} x2={18} y2={8} stroke={color} strokeWidth={1.8} />
        <Line x1={7} y1={12.5} x2={13} y2={12.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Line x1={4} y1={5} x2={16} y2={5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={4} y1={10} x2={16} y2={10} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={4} y1={15} x2={11.5} y2={15} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={8.5} cy={8.5} r={5.5} stroke="#A7A39D" strokeWidth={1.8} />
      <Path d="M12.5 12.5L17 17" stroke="#A7A39D" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function MemberIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={6.5} r={3} stroke="#A7A39D" strokeWidth={1.8} />
      <Path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="#A7A39D" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PlusIcon({ color = "white", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Line x1={8} y1={2} x2={8} y2={14} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={2} y1={8} x2={14} y2={8} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckboxIcon({ status }: { status: TaskSummary["status"] }) {
  if (status === "DONE") {
    return (
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#2F7E5A", alignItems: "center", justifyContent: "center" }}>
        <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
          <Path d="M2 5l2.2 2.2L8 2.5" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#65AEEA", backgroundColor: "rgba(101,174,234,0.12)", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#65AEEA" }} />
      </View>
    );
  }
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#C8C4BE" }} />
  );
}

function EmptyDayIcon() {
  return (
    <Svg width={66} height={66} viewBox="0 0 66 66" fill="none">
      <Rect x={6} y={6} width={54} height={54} rx={18} fill="#F3EEE8" />
      <Rect x={23} y={22} width={20} height={24} rx={5} fill="#D6E4DB" stroke="#7AA38C" strokeWidth={2} />
      <Line x1={28} y1={18} x2={28} y2={25} stroke="#7AA38C" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={38} y1={18} x2={38} y2={25} stroke="#7AA38C" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={23} y1={30} x2={43} y2={30} stroke="#7AA38C" strokeWidth={2} />
      <Circle cx={38} cy={42} r={6} fill="#2F7E5A" />
      <Path d="M35.5 42.1l1.7 1.7 3.3-3.5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SparkIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
      <Path d="M13 3v5M13 18v5M3 13h5M18 13h5M6.2 6.2l3.5 3.5M16.3 16.3l3.5 3.5M6.2 19.8l3.5-3.5M16.3 9.7l3.5-3.5" stroke="#2F7E5A" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 4l4 4-4 4" stroke="#C8C4BE" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Task cards ───────────────────────────────────────────────────────────────

function AgendaTaskCard({
  task,
  member,
  onToggle,
  onPress,
}: {
  task: TaskSummary;
  member?: MemberSummary;
  onToggle: (taskId: string, current: TaskSummary["status"]) => void;
  onPress: (task: TaskSummary) => void;
}) {
  const isDone = task.status === "DONE";
  const meta = statusMeta[task.status];
  const colors = member ? memberColorMap[member.color] : { bg: "#F1EFEC", text: "#666" };
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", opacity: isDone ? 0.75 : 1 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <TouchableOpacity onPress={() => onToggle(task.id, task.status)} activeOpacity={0.75} style={{ marginTop: 2 }}>
          <CheckboxIcon status={task.status} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPress(task)} activeOpacity={0.7} style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: isDone ? "#A7A39D" : "#101111",
              textDecorationLine: isDone ? "line-through" : "none",
            }}
          >
            {task.title}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 }}>
            {task.dueAt ? <Text style={{ fontSize: 11, color: "#A7A39D" }}>{formatTimeOnly(task.dueAt)}</Text> : null}
            <View style={{ borderRadius: 999, backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text }}>{task.assignedTo.split(" ")[0]}</Text>
            </View>
            {task.assignedBy && task.assignedBy !== task.assignedTo ? (
              <View style={{ borderRadius: 999, backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, color: "#8A8680" }}>por {task.assignedBy.split(" ")[0]}</Text>
              </View>
            ) : null}
            {task.frequency && task.frequency !== "ONCE" ? (
              <View style={{ borderRadius: 999, backgroundColor: "#EAF3EE", paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F7E5A" }}>{frequencyLabel[task.frequency]}</Text>
              </View>
            ) : null}
            {task.priority && task.priority !== "LOW" ? (
              <View style={{ borderRadius: 999, backgroundColor: priorityMeta[task.priority].bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: priorityMeta[task.priority].text }}>{priorityMeta[task.priority].label}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPress(task)} activeOpacity={0.7} style={{ borderRadius: 999, backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: meta.dot }} />
          <Text style={{ fontSize: 10, fontWeight: "800", color: meta.text }}>{meta.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ListTaskRow({
  task,
  member,
  isLast,
  onToggle,
  onPress,
}: {
  task: TaskSummary;
  member?: MemberSummary;
  isLast: boolean;
  onToggle: (taskId: string, current: TaskSummary["status"]) => void;
  onPress: (task: TaskSummary) => void;
}) {
  const isDone = task.status === "DONE";
  const meta = statusMeta[task.status];
  const colors = member ? memberColorMap[member.color] : { bg: "#F1EFEC", text: "#666" };
  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "rgba(0,0,0,0.04)" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <TouchableOpacity onPress={() => onToggle(task.id, task.status)} activeOpacity={0.75} style={{ marginTop: 3 }}>
          <CheckboxIcon status={task.status} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPress(task)} activeOpacity={0.7} style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: isDone ? "#A7A39D" : "#101111",
              textDecorationLine: isDone ? "line-through" : "none",
            }}
          >
            {task.title}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 11, color: "#A7A39D" }}>
              {task.dueDate ? `${new Date(`${getTaskIsoDate(task)}T12:00:00Z`).getUTCDate()} de ${formatShortMonth(getTaskIsoDate(task))}.` : ""}
            </Text>
            <View style={{ borderRadius: 999, backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text }}>{task.assignedTo.split(" ")[0]}</Text>
            </View>
            {task.assignedBy && task.assignedBy !== task.assignedTo ? (
              <View style={{ borderRadius: 999, backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, color: "#8A8680" }}>por {task.assignedBy.split(" ")[0]}</Text>
              </View>
            ) : null}
            {task.frequency && task.frequency !== "ONCE" ? (
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F7E5A" }}>{frequencyLabel[task.frequency]}</Text>
            ) : null}
            {task.priority && task.priority !== "LOW" ? (
              <View style={{ borderRadius: 999, backgroundColor: priorityMeta[task.priority].bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: priorityMeta[task.priority].text }}>{priorityMeta[task.priority].label}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPress(task)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ borderRadius: 999, backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: meta.dot }} />
            <Text style={{ fontSize: 10, fontWeight: "800", color: meta.text }}>{meta.label}</Text>
          </View>
          <ChevronRightIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Task detail sheet ────────────────────────────────────────────────────────

function TaskDetailSheet({
  task,
  member,
  visible,
  onClose,
  onStatusChange,
}: {
  task: TaskSummary | null;
  member?: MemberSummary;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, current: TaskSummary["status"]) => void;
}) {
  if (!task) return null;
  const colors = member ? memberColorMap[member.color] : { bg: "#F1EFEC", text: "#666" };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Detalle de tarea</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 13, color: "#8E8880" }}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Title */}
          <View style={{ borderRadius: 20, backgroundColor: "white", padding: 18, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A39D", marginBottom: 8 }}>Título</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: task.status === "DONE" ? "#A7A39D" : "#101111", textDecorationLine: task.status === "DONE" ? "line-through" : "none" }}>
              {task.title}
            </Text>
          </View>

          {/* Status switcher */}
          <View style={{ borderRadius: 20, backgroundColor: "white", padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A39D", marginBottom: 12 }}>Estado</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["TODO", "IN_PROGRESS", "DONE"] as TaskSummary["status"][]).map((s) => {
                const m = statusMeta[s];
                const active = task.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      if (!active) onStatusChange(task.id, task.status);
                    }}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: "center",
                      backgroundColor: active ? m.bg : "#F7F4F0",
                      borderWidth: active ? 1.5 : 0,
                      borderColor: active ? m.dot : "transparent",
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.dot, marginBottom: 6 }} />
                    <Text style={{ fontSize: 10, fontWeight: "800", color: active ? m.text : "#A7A39D" }}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ marginTop: 10, fontSize: 11, color: "#A7A39D", textAlign: "center" }}>
              Toca el checkbox en el listado para avanzar: Sin empezar → En curso → Listo
            </Text>
          </View>

          {/* Info grid */}
          <View style={{ borderRadius: 20, backgroundColor: "white", padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A39D" }}>Información</Text>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: "#7F7C78" }}>Responsable</Text>
              <View style={{ borderRadius: 999, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>{task.assignedTo}</Text>
              </View>
            </View>

            {task.dueAt || task.dueDate ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#7F7C78" }}>Fecha</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>
                  {formatSelectedDay(getTaskIsoDate(task))}{task.dueAt ? ` · ${formatTimeOnly(task.dueAt)}` : ""}
                </Text>
              </View>
            ) : null}

            {task.priority ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#7F7C78" }}>Prioridad</Text>
                <View style={{ borderRadius: 999, backgroundColor: priorityMeta[task.priority].bg, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: priorityMeta[task.priority].text }}>{priorityMeta[task.priority].label}</Text>
                </View>
              </View>
            ) : null}

            {task.frequency ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#7F7C78" }}>Frecuencia</Text>
                <View style={{ borderRadius: 999, backgroundColor: "#EAF3EE", paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#2F7E5A" }}>{frequencyLabel[task.frequency]}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Notes */}
          {task.notes ? (
            <View style={{ borderRadius: 20, backgroundColor: "white", padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A39D", marginBottom: 8 }}>Notas</Text>
              <Text style={{ fontSize: 13, color: "#555", lineHeight: 20 }}>{task.notes}</Text>
            </View>
          ) : null}

          {/* Quick status action */}
          {task.status !== "DONE" ? (
            <TouchableOpacity
              onPress={() => {
                onStatusChange(task.id, task.status);
                onClose();
              }}
              activeOpacity={0.85}
              style={{
                borderRadius: 999,
                backgroundColor: task.status === "TODO" ? "#3E76AE" : "#2F7E5A",
                paddingVertical: 16,
                alignItems: "center",
                shadowColor: task.status === "TODO" ? "#3E76AE" : "#2F7E5A",
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>
                {task.status === "TODO" ? "Marcar en curso →" : "Marcar como lista ✓"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                onStatusChange(task.id, task.status);
                onClose();
              }}
              activeOpacity={0.85}
              style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#7F7C78" }}>Volver a pendiente</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { session } = useSession();
  const { addNotification } = useNotifications();

  const [data, setData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewMode>("month");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [listStatusFilter, setListStatusFilter] = useState<ListStatusFilter>("ALL");
  const [listMemberFilter, setListMemberFilter] = useState("ALL");
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Date picker state for create modal
  const [pickerMonth, setPickerMonth] = useState(startOfMonth(getTodayIso()));
  const [pickerHour, setPickerHour] = useState(9);

  const todayIso = getTodayIso();
  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(todayIso));

  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    title: "",
    assignedTo: "",
    dueDate: buildQuickDate(todayIso, 9),
    priority: "MEDIUM",
    frequency: "ONCE",
    notes: "",
  });

  // Sync picker month when modal opens
  useEffect(() => {
    if (creating) {
      const dateIso = createDraft.dueDate.slice(0, 10) || todayIso;
      setPickerMonth(startOfMonth(dateIso));
      setPickerHour(9);
    }
  }, [creating]);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: DashboardData } & Partial<DashboardData>>(
        "/api/dashboard",
        { token: session.token },
      );
      const d: DashboardData = (raw as any).data ?? (raw as unknown as DashboardData);
      setData(d);
      setTasks(d.tasks ?? []);
    } catch {}
    setLoading(false);
  }, [session?.token]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadEvents = useCallback(async () => {
    const events = await fetchTaskEvents({
      token: session?.token,
      householdId: session?.householdId ?? "demo-household-1",
      readerRole: session?.role ?? "OWNER",
      readerName: session?.name ?? "",
    });
    for (const ev of events) {
      if (ev.type === "TASK_STATUS_CHANGED") {
        addNotification({
          title: `${ev.fromName.split(" ")[0]} actualizó una tarea`,
          body: `"${ev.taskTitle}" → ${statusLabel(ev.newStatus)}`,
          href: "/(app)/tasks",
          icon: "task",
        });
      } else if (ev.type === "TASK_DELEGATED") {
        addNotification({
          title: "Nueva tarea asignada a ti",
          body: `"${ev.taskTitle}" de ${ev.fromName.split(" ")[0]}`,
          href: "/(app)/tasks",
          icon: "task",
        });
      }
    }
  }, [session?.token, session?.householdId, session?.role, session?.name, addNotification]);

  useFocusEffect(useCallback(() => {
    void loadData();
    void loadEvents();
  }, [loadData, loadEvents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    setVisibleMonth(startOfMonth(selectedDay));
  }, [selectedDay]);

  const members = data?.members ?? [];
  const viewerName = data?.viewer?.name ?? session?.name ?? "";
  const viewerFirstName = viewerName.split(" ")[0] ?? "";
  const viewerInitials = viewerName.split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  const monthPendingCount = useMemo(() => {
    const endMonth = shiftMonth(visibleMonth, 1);
    return tasks.filter((task) => {
      const iso = getTaskIsoDate(task);
      return iso >= visibleMonth && iso < endMonth && task.status !== "DONE";
    }).length;
  }, [tasks, visibleMonth]);

  const calendarDays = useMemo(() => buildMonthGrid(visibleMonth, tasks), [visibleMonth, tasks]);

  const selectedDayTasks = useMemo(
    () => tasks
      .filter((task) => getTaskIsoDate(task) === selectedDay)
      .sort((a, b) => (a.dueAt ?? a.dueDate).localeCompare(b.dueAt ?? b.dueDate)),
    [tasks, selectedDay]
  );

  const allTasksSorted = useMemo(
    () => [...tasks].sort((a, b) => getTaskIsoDate(a).localeCompare(getTaskIsoDate(b))),
    [tasks]
  );

  const filteredListTasks = useMemo(() => {
    return allTasksSorted.filter((task) => {
      const matchesStatus = listStatusFilter === "ALL" || task.status === listStatusFilter;
      const matchesSearch = !listSearch.trim() || task.title.toLowerCase().includes(listSearch.trim().toLowerCase());
      const matchesMember = listMemberFilter === "ALL" || task.assignedTo === listMemberFilter;
      return matchesStatus && matchesSearch && matchesMember;
    });
  }, [allTasksSorted, listStatusFilter, listSearch, listMemberFilter]);

  function openDetail(task: TaskSummary) {
    setSelectedTask(task);
    setDetailOpen(true);
  }

  async function handleStatusToggle(taskId: string, current: TaskSummary["status"]) {
    const next = nextStatus(current);
    const snapshot = tasks;

    setTasks((cur) => cur.map((t) => t.id === taskId ? { ...t, status: next } : t));
    setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: next } : prev);

    if (next === "DONE") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await apiFetch("/api/tasks", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({ taskId, status: next }),
      });

      if (next === "DONE") {
        const task = snapshot.find((t) => t.id === taskId);
        if (task) {
          addNotification({
            title: "Tarea completada",
            body: task.title,
            href: "/(app)/tasks",
            icon: "task",
          });
        }
      }
    } catch {
      setTasks(snapshot);
      setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: current } : prev);
    }
  }

  async function handleCreate() {
    if (!createDraft.title.trim()) return;
    setSaving(true);

    const assignee = createDraft.assignedTo || viewerFirstName;
    const iso = createDraft.dueDate.slice(0, 10);
    const tempId = `temp-${Date.now()}`;

    const optimistic: TaskSummary = {
      id: tempId,
      title: createDraft.title,
      assignedTo: assignee,
      assignedBy: viewerName,
      dueDate: iso,
      dueAt: createDraft.dueDate,
      status: "TODO",
      priority: createDraft.priority,
      frequency: createDraft.frequency,
      notes: createDraft.notes || undefined,
    };

    setTasks((cur) => [optimistic, ...cur]);
    setSelectedDay(iso);
    setVisibleMonth(startOfMonth(iso));
    setView("day");
    setCreating(false);
    setSaving(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setCreateDraft({
      title: "",
      assignedTo: "",
      dueDate: buildQuickDate(iso, 9),
      priority: "MEDIUM",
      frequency: "ONCE",
      notes: "",
    });

    try {
      const assigneeMember = members.find((m) => m.name === assignee);
      const response = await apiFetch<{ ok: boolean; data: TaskSummary }>("/api/tasks", {
        method: "POST",
        token: session?.token,
        body: JSON.stringify({
          householdId: data?.household?.id ?? "demo",
          title: createDraft.title,
          assignedTo: assignee,
          assignedBy: viewerName,
          dueDate: createDraft.dueDate,
          priority: createDraft.priority,
          frequency: createDraft.frequency,
          description: createDraft.notes || undefined,
        }),
      });

      if (response.ok && response.data) {
        setTasks((cur) => cur.map((t) => t.id === tempId ? response.data : t));
      }

      // Notify the assignee if they're a different person
      if (assignee !== viewerName && assigneeMember) {
        void postTaskEvent({
          token: session?.token,
          householdId: data?.household?.id ?? "demo-household-1",
          type: "TASK_DELEGATED",
          taskId: tempId,
          taskTitle: createDraft.title,
          fromName: viewerName,
          toRole: assigneeMember.roleKey ?? "MEMBER",
        });
        addNotification({
          title: "Tarea delegada",
          body: `"${createDraft.title}" asignada a ${assignee.split(" ")[0]}`,
          href: "/(app)/tasks",
          icon: "task",
        });
      }
    } catch {
      // Keep optimistic task on network error
    }
  }

  const selectedMemberName = listMemberFilter === "ALL" ? "Todos los responsables" : listMemberFilter;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <AppHeader viewerInitials={viewerInitials} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0D7655" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
      <AppHeader viewerInitials={viewerInitials} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 34, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7655" />}
      >
        {/* Title row */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#101111" }}>Tareas</Text>
            <Text style={{ marginTop: 3, fontSize: 11, color: "#7F7C78" }}>
              {monthPendingCount > 0
                ? `${monthPendingCount} pendiente${monthPendingCount !== 1 ? "s" : ""} este mes`
                : "Todo al día este mes"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setCreateDraft((cur) => ({ ...cur, dueDate: buildQuickDate(selectedDay, 9) }));
              setCreating(true);
            }}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              backgroundColor: "#F47A21",
              paddingHorizontal: 18,
              paddingVertical: 13,
              shadowColor: "#F47A21",
              shadowOpacity: 0.34,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 5 },
            }}
          >
            <PlusIcon size={16} />
            <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Nueva tarea</Text>
          </TouchableOpacity>
        </View>

        {/* View toggle */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "white",
            padding: 6,
            borderRadius: 28,
            shadowColor: "#000",
            shadowOpacity: 0.07,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          {([
            { id: "month", label: "Mes" },
            { id: "day", label: "Día" },
            { id: "list", label: "Lista" },
          ] as { id: ViewMode; label: string }[]).map((tab) => {
            const active = view === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setView(tab.id)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: 22,
                  paddingVertical: 12,
                  backgroundColor: active ? "#2F7E5A" : "transparent",
                }}
              >
                <CalendarTabIcon kind={tab.id} active={active} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "white" : "#A7A39D" }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── MONTH VIEW ── */}
        {view === "month" ? (
          <View
            style={{
              borderRadius: 30,
              backgroundColor: "white",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatMonthTitle(visibleMonth)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity onPress={() => setVisibleMonth(shiftMonth(visibleMonth, -1))} activeOpacity={0.8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: "#666" }}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setSelectedDay(todayIso); setVisibleMonth(startOfMonth(todayIso)); }}
                  activeOpacity={0.8}
                  style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#666" }}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setVisibleMonth(shiftMonth(visibleMonth, 1))} activeOpacity={0.8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: "#666" }}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }}>
              {weekdayLabels.map((label) => (
                <View key={label} style={{ flex: 1, paddingVertical: 8, alignItems: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.6, color: "#A7A39D" }}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {calendarDays.map((day) => {
                const selected = selectedDay === day.isoDate;
                return (
                  <TouchableOpacity
                    key={day.id}
                    onPress={() => {
                      setSelectedDay(day.isoDate);
                      setView("day");
                    }}
                    activeOpacity={0.85}
                    style={{
                      width: "14.285%",
                      minHeight: 68,
                      borderRightWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: "rgba(0,0,0,0.05)",
                      alignItems: "center",
                      paddingTop: 8,
                      gap: 4,
                      opacity: day.inCurrentMonth ? 1 : 0.32,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: day.isToday ? "#2F7E5A" : selected ? "rgba(47,126,90,0.14)" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: day.isToday || selected ? "800" : "500", color: day.isToday ? "white" : "#101111" }}>
                        {day.dateNumber}
                      </Text>
                    </View>
                    {/* Priority-colored task dots */}
                    {day.tasks.length > 0 ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        {day.tasks.some((t) => t.status !== "DONE" && t.priority === "HIGH") ? (
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#D24D63" }} />
                        ) : null}
                        {day.tasks.some((t) => t.status !== "DONE" && t.priority === "MEDIUM") ? (
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#F4A521" }} />
                        ) : null}
                        {day.tasks.some((t) => t.status !== "DONE" && t.priority === "LOW") ? (
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#A7A39D" }} />
                        ) : null}
                        {day.doneCount > 0 ? (
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#D9E5DE" }} />
                        ) : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected day summary bar */}
            <View style={{ margin: 16, borderRadius: 20, backgroundColor: "#F3EEE8", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#555" }}>{formatSelectedDay(selectedDay)}</Text>
                <Text style={{ marginTop: 3, fontSize: 12, color: "#A7A39D" }}>
                  {selectedDayTasks.length === 0
                    ? "Sin tareas"
                    : `${selectedDayTasks.filter((t) => t.status !== "DONE").length} pendiente${selectedDayTasks.filter((t) => t.status !== "DONE").length !== 1 ? "s" : ""} · ${selectedDayTasks.filter((t) => t.status === "DONE").length} listas`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setView("day")}
                activeOpacity={0.85}
                style={{ borderRadius: 999, backgroundColor: "#2F7E5A", paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Ver agenda →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── DAY VIEW ── */}
        {view === "day" ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#A7A39D" }}>{formatMonthTitle(visibleMonth)}</Text>
                <Text style={{ marginTop: 2, fontSize: 17, fontWeight: "800", color: "#101111" }}>{formatSelectedDay(selectedDay)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedDay(shiftIsoDay(selectedDay, -1))}
                  activeOpacity={0.8}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}
                >
                  <Text style={{ fontSize: 18, color: "#666" }}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedDay(todayIso)}
                  activeOpacity={0.8}
                  style={{ borderRadius: 999, backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#666" }}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedDay(shiftIsoDay(selectedDay, 1))}
                  activeOpacity={0.8}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}
                >
                  <Text style={{ fontSize: 18, color: "#666" }}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedDayTasks.length === 0 ? (
              <View style={{ borderRadius: 30, backgroundColor: "white", paddingHorizontal: 24, paddingVertical: 40, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
                <EmptyDayIcon />
                <Text style={{ marginTop: 18, fontSize: 14, fontWeight: "800", color: "#101111" }}>Sin tareas para este día</Text>
                <Text style={{ marginTop: 6, fontSize: 11, color: "#B0ADA8", textAlign: "center" }}>¡Buen trabajo! Disfruta tu día.</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCreateDraft((cur) => ({ ...cur, dueDate: buildQuickDate(selectedDay, 9) }));
                    setCreating(true);
                  }}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 22,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 999,
                    backgroundColor: "#2F7E5A",
                    paddingHorizontal: 28,
                    paddingVertical: 14,
                    shadowColor: "#2F7E5A",
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <PlusIcon size={16} />
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Nueva tarea para este día</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ borderRadius: 30, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
                {selectedDayTasks.map((task) => (
                  <AgendaTaskCard
                    key={task.id}
                    task={task}
                    member={members.find((m) => m.name === task.assignedTo)}
                    onToggle={handleStatusToggle}
                    onPress={openDetail}
                  />
                ))}
                <TouchableOpacity
                  onPress={() => {
                    setCreateDraft((cur) => ({ ...cur, dueDate: buildQuickDate(selectedDay, 9) }));
                    setCreating(true);
                  }}
                  activeOpacity={0.85}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)" }}
                >
                  <PlusIcon color="#2F7E5A" size={14} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F7E5A" }}>Agregar tarea en este día</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick add card */}
            <View style={{ borderRadius: 22, backgroundColor: "white", paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#E8F2EC", alignItems: "center", justifyContent: "center" }}>
                <SparkIcon />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>¿Qué necesitas hacer?</Text>
                <Text style={{ marginTop: 2, fontSize: 11, color: "#A7A39D" }}>Agrega una tarea rápida</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreating(true)}
                activeOpacity={0.8}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8F2EC", alignItems: "center", justifyContent: "center" }}
              >
                <PlusIcon color="#2F7E5A" size={20} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* ── LIST VIEW ── */}
        {view === "list" ? (
          <>
            {/* Search */}
            <View style={{ borderRadius: 22, backgroundColor: "white", paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
              <SearchIcon />
              <TextInput
                value={listSearch}
                onChangeText={setListSearch}
                placeholder="Buscar tarea..."
                placeholderTextColor="#B0ADA8"
                style={{ flex: 1, fontSize: 13, color: "#101111" }}
              />
              {listSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setListSearch("")} activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, color: "#A7A39D" }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Member filter */}
            <TouchableOpacity
              onPress={() => setMemberPickerOpen(true)}
              activeOpacity={0.85}
              style={{ borderRadius: 22, backgroundColor: "white", paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            >
              <MemberIcon />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: listMemberFilter !== "ALL" ? "#2F7E5A" : "#555" }}>{selectedMemberName}</Text>
              <Text style={{ color: "#A7A39D" }}>▾</Text>
            </TouchableOpacity>

            {/* Status filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10, paddingVertical: 2 }}>
                {([
                  { key: "ALL", label: "Todas" },
                  { key: "TODO", label: "Sin empezar" },
                  { key: "IN_PROGRESS", label: "En curso" },
                  { key: "DONE", label: "Listas" },
                ] as { key: ListStatusFilter; label: string }[]).map((option) => {
                  const active = listStatusFilter === option.key;
                  const count = option.key === "ALL" ? null : allTasksSorted.filter((t) => t.status === option.key).length;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setListStatusFilter(option.key)}
                      activeOpacity={0.85}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        backgroundColor: active ? "#2F7E5A" : "white",
                        borderWidth: active ? 0 : 1,
                        borderColor: "rgba(0,0,0,0.06)",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#7F7C78" }}>
                        {option.label}{count !== null ? ` · ${count}` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Task list */}
            <View style={{ borderRadius: 26, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9F7F4", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, color: "#A7A39D" }}>TAREA</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, color: "#A7A39D" }}>ESTADO</Text>
              </View>

              {filteredListTasks.length === 0 ? (
                <View style={{ paddingHorizontal: 24, paddingVertical: 34, alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: "#A7A39D" }}>
                    {listSearch ? `Sin resultados para "${listSearch}"` : "Sin tareas en esta categoría."}
                  </Text>
                </View>
              ) : (
                filteredListTasks.map((task, index) => (
                  <ListTaskRow
                    key={task.id}
                    task={task}
                    member={members.find((m) => m.name === task.assignedTo)}
                    isLast={index === filteredListTasks.length - 1}
                    onToggle={handleStatusToggle}
                    onPress={openDetail}
                  />
                ))
              )}

              <TouchableOpacity
                onPress={() => {
                  setCreateDraft((cur) => ({ ...cur, dueDate: buildQuickDate(selectedDay, 9) }));
                  setCreating(true);
                }}
                activeOpacity={0.85}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", paddingHorizontal: 18, paddingVertical: 14 }}
              >
                <PlusIcon color="#2F7E5A" size={14} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#2F7E5A" }}>Nueva tarea</Text>
              </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { label: "Total", value: allTasksSorted.length, color: "#101111" },
                { label: "Pendientes", value: allTasksSorted.filter((t) => t.status === "TODO").length, color: "#A5A29E" },
                { label: "En curso", value: allTasksSorted.filter((t) => t.status === "IN_PROGRESS").length, color: "#65AEEA" },
                { label: "Listas", value: allTasksSorted.filter((t) => t.status === "DONE").length, color: "#2F7E5A" },
              ].map((stat) => (
                <View key={stat.label} style={{ flex: 1, borderRadius: 16, backgroundColor: "white", padding: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: stat.color }}>{stat.value}</Text>
                  <Text style={{ marginTop: 3, fontSize: 10, color: "#A7A39D", textAlign: "center" }}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Tip card */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, backgroundColor: "rgba(13,118,85,0.07)", paddingHorizontal: 16, paddingVertical: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(13,118,85,0.10)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path d="M10 2a6 6 0 0 1 6 6c0 2.4-1.4 4.5-3.5 5.5V15a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-1.5C5.4 12.5 4 10.4 4 8a6 6 0 0 1 6-6z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M8 18h4" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0D7655" }}>Consejo Noma</Text>
                <Text style={{ marginTop: 2, fontSize: 11, color: "rgba(13,118,85,0.7)" }}>
                  {allTasksSorted.filter((t) => t.status === "DONE").length >= 3
                    ? "¡Excelente ritmo! El hogar está en orden."
                    : `Completa ${Math.max(3 - allTasksSorted.filter((t) => t.status === "DONE").length, 1)} tarea${allTasksSorted.filter((t) => t.status === "DONE").length < 2 ? "s" : ""} más hoy para mantener el hogar al día.`}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* ── Member picker ── */}
      <Modal transparent visible={memberPickerOpen} animationType="fade" onRequestClose={() => setMemberPickerOpen(false)}>
        <TouchableOpacity onPress={() => setMemberPickerOpen(false)} activeOpacity={1} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#F5F0EA", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 14, paddingBottom: 26 }}>
            <View style={{ alignItems: "center", paddingBottom: 10 }}>
              <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)" }} />
            </View>
            <Text style={{ paddingHorizontal: 20, fontSize: 14, fontWeight: "800", color: "#101111", marginBottom: 14 }}>Filtrar por responsable</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {["ALL", ...members.map((m) => m.name)].map((value) => {
                const active = listMemberFilter === value;
                const label = value === "ALL" ? "Todos los responsables" : value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => { setListMemberFilter(value); setMemberPickerOpen(false); }}
                    activeOpacity={0.85}
                    style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: active ? "rgba(47,126,90,0.10)" : "transparent" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? "800" : "600", color: active ? "#2F7E5A" : "#555" }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Create task modal ── */}
      <Modal visible={creating} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreating(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Nueva tarea</Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: "#A7A39D" }}>{formatSelectedDay(selectedDay)}</Text>
            </View>
            <TouchableOpacity onPress={() => setCreating(false)}>
              <Text style={{ fontSize: 13, color: "#8E8880" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 20, paddingTop: 20, paddingBottom: 32 }}>

              {/* Title */}
              <TextInput
                value={createDraft.title}
                onChangeText={(v) => setCreateDraft((c) => ({ ...c, title: v }))}
                placeholder="Título de la tarea *"
                placeholderTextColor="#B8B2AA"
                style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 16, color: "#101111", fontSize: 14, fontWeight: "600" }}
                multiline
                autoFocus
              />

              {/* Notes */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: "#2F7E5A" }}>Notas (opcional)</Text>
                <TextInput
                  value={createDraft.notes}
                  onChangeText={(v) => setCreateDraft((c) => ({ ...c, notes: v }))}
                  placeholder="Instrucciones, contexto..."
                  placeholderTextColor="#B8B2AA"
                  style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111", fontSize: 13, minHeight: 80, textAlignVertical: "top" }}
                  multiline
                />
              </View>

              {/* Date picker — visual mini calendar */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: "#2F7E5A" }}>Fecha y hora</Text>

                {/* Mini calendar */}
                <View style={{ borderRadius: 18, backgroundColor: "white", overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}>
                  {/* Month navigation */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
                    <TouchableOpacity
                      onPress={() => setPickerMonth(shiftMonth(pickerMonth, -1))}
                      activeOpacity={0.8}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 16, color: "#666" }}>‹</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatMonthTitle(pickerMonth)}</Text>
                    <TouchableOpacity
                      onPress={() => setPickerMonth(shiftMonth(pickerMonth, 1))}
                      activeOpacity={0.8}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 16, color: "#666" }}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weekday labels */}
                  <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
                    {weekdayLabels.map((label) => (
                      <View key={label} style={{ flex: 1, paddingVertical: 6, alignItems: "center" }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1, color: "#A7A39D" }}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Day grid */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingBottom: 8 }}>
                    {buildMonthGrid(pickerMonth, []).map((day) => {
                      const selectedDate = createDraft.dueDate.slice(0, 10);
                      const isSelected = selectedDate === day.isoDate;
                      const isToday = day.isoDate === todayIso;
                      return (
                        <TouchableOpacity
                          key={day.id}
                          onPress={() => {
                            setCreateDraft((c) => ({ ...c, dueDate: buildQuickDate(day.isoDate, pickerHour) }));
                          }}
                          activeOpacity={0.85}
                          style={{
                            width: "14.285%",
                            paddingVertical: 4,
                            alignItems: "center",
                            opacity: day.inCurrentMonth ? 1 : 0.28,
                          }}
                        >
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: isSelected ? "#2F7E5A" : isToday ? "rgba(47,126,90,0.12)" : "transparent",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: isSelected || isToday ? "800" : "500", color: isSelected ? "white" : "#101111" }}>
                              {day.dateNumber}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Hour quick picks */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, paddingBottom: 2 }}>
                    {[
                      { label: "8am", hour: 8 },
                      { label: "9am", hour: 9 },
                      { label: "12pm", hour: 12 },
                      { label: "2pm", hour: 14 },
                      { label: "6pm", hour: 18 },
                      { label: "8pm", hour: 20 },
                    ].map((opt) => {
                      const active = pickerHour === opt.hour;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          onPress={() => {
                            setPickerHour(opt.hour);
                            const currentDate = createDraft.dueDate.slice(0, 10) || todayIso;
                            setCreateDraft((c) => ({ ...c, dueDate: buildQuickDate(currentDate, opt.hour) }));
                          }}
                          activeOpacity={0.85}
                          style={{ borderRadius: 999, borderWidth: 1, borderColor: active ? "#2F7E5A" : "rgba(0,0,0,0.08)", backgroundColor: active ? "#E8F2EC" : "white", paddingHorizontal: 14, paddingVertical: 10 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#2F7E5A" : "#666" }}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Assignee */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: "#2F7E5A" }}>Asignar a</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, paddingBottom: 2 }}>
                    {members.map((member) => {
                      const active = createDraft.assignedTo === member.name;
                      return (
                        <TouchableOpacity
                          key={member.id}
                          onPress={() => setCreateDraft((c) => ({ ...c, assignedTo: active ? "" : member.name }))}
                          activeOpacity={0.85}
                          style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: active ? "#2F7E5A" : "#F9F7F4", borderWidth: active ? 0 : 1, borderColor: "rgba(0,0,0,0.08)" }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#555" }}>{member.name.split(" ")[0]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {members.length === 0 ? (
                      <Text style={{ fontSize: 12, color: "#A7A39D", paddingVertical: 10 }}>Sin miembros — se asignará a ti</Text>
                    ) : null}
                  </View>
                </ScrollView>
              </View>

              {/* Priority */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: "#2F7E5A" }}>Prioridad</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["LOW", "MEDIUM", "HIGH"] as CreateDraft["priority"][]).map((p) => {
                    const m = priorityMeta[p];
                    const active = createDraft.priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setCreateDraft((c) => ({ ...c, priority: p }))}
                        activeOpacity={0.85}
                        style={{ flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: active ? m.bg : "#F9F7F4", borderWidth: active ? 1.5 : 0, borderColor: active ? m.text : "transparent" }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? m.text : "#A7A39D" }}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Frequency */}
              <View>
                <Text style={{ marginBottom: 10, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: "#2F7E5A" }}>Frecuencia</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {(["ONCE", "DAILY", "WEEKLY", "MONTHLY"] as CreateDraft["frequency"][]).map((f) => {
                    const active = createDraft.frequency === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setCreateDraft((c) => ({ ...c, frequency: f }))}
                        activeOpacity={0.85}
                        style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: active ? "#2F7E5A" : "white", borderWidth: active ? 0 : 1, borderColor: "rgba(0,0,0,0.08)" }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "white" : "#7F7C78" }}>{frequencyLabel[f]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Save button */}
              <TouchableOpacity
                onPress={handleCreate}
                disabled={saving || !createDraft.title.trim()}
                activeOpacity={0.85}
                style={{
                  borderRadius: 999,
                  backgroundColor: "#F47A21",
                  paddingVertical: 18,
                  alignItems: "center",
                  opacity: saving || !createDraft.title.trim() ? 0.5 : 1,
                  shadowColor: "#F47A21",
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                {saving
                  ? <ActivityIndicator color="white" />
                  : <Text style={{ fontSize: 14, fontWeight: "800", color: "white" }}>Guardar tarea</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Task detail sheet ── */}
      <TaskDetailSheet
        task={selectedTask}
        member={selectedTask ? members.find((m) => m.name === selectedTask.assignedTo) : undefined}
        visible={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedTask(null); }}
        onStatusChange={handleStatusToggle}
      />
    </View>
  );
}

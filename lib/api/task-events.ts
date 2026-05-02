import { apiFetch } from "@/lib/api/client";

export type TaskEvent = {
  id: string;
  householdId: string;
  type: "TASK_DELEGATED" | "TASK_STATUS_CHANGED";
  taskId: string;
  taskTitle: string;
  fromName: string;
  toRole: string;
  newStatus?: string;
  timestamp: string;
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Completada",
};

export function statusLabel(s?: string) {
  return s ? (STATUS_LABELS[s] ?? s) : "";
}

export async function postTaskEvent(params: {
  token?: string;
  householdId: string;
  type: "TASK_DELEGATED" | "TASK_STATUS_CHANGED";
  taskId: string;
  taskTitle: string;
  fromName: string;
  toRole: string;
  newStatus?: string;
}) {
  try {
    await apiFetch("/api/notification-events", {
      method: "POST",
      token: params.token,
      body: JSON.stringify({
        householdId: params.householdId,
        type: params.type,
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        fromName: params.fromName,
        toRole: params.toRole,
        newStatus: params.newStatus,
      }),
    });
  } catch {
    // Non-critical — silent fail
  }
}

export async function fetchTaskEvents(params: {
  token?: string;
  householdId: string;
  readerRole: string;
  readerName: string;
}): Promise<TaskEvent[]> {
  try {
    const res = await apiFetch<{ ok: boolean; data: TaskEvent[] }>(
      `/api/notification-events?householdId=${encodeURIComponent(params.householdId)}&readerRole=${encodeURIComponent(params.readerRole)}&readerName=${encodeURIComponent(params.readerName)}`,
      { token: params.token },
    );
    return res?.data ?? [];
  } catch {
    return [];
  }
}

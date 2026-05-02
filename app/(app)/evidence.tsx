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
} from "react-native";
import { useFocusEffect } from "expo-router";

import { AppHeader } from "@/components/shell/AppHeader";
import { useSession } from "@/lib/contexts/session-context";
import { apiFetch } from "@/lib/api/client";
import type { DashboardData, EmployeeTask } from "@/lib/types";

// ── Screen ─────────────────────────────────────────────────────────────────

export default function EvidenceScreen() {
  const { session } = useSession();

  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "delivered">("all");

  const viewerInitials = (session?.name ?? "")
    .split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: DashboardData } & Partial<DashboardData>>(
        "/api/dashboard",
        { token: session.token },
      );
      const d: DashboardData = (raw as any).data ?? (raw as unknown as DashboardData);
      setTasks(d.employee?.tasks ?? []);
    } catch { /* silent */ }
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

  // Derived lists — mirrors web version logic
  const pendingEvidence = useMemo(
    () => tasks.filter((t) => /sin foto|adjuntar/i.test(t.photoStatus)),
    [tasks]
  );
  const deliveredEvidence = useMemo(
    () => tasks.filter((t) => !!t.evidenceUrl),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    if (activeFilter === "pending") return pendingEvidence;
    if (activeFilter === "delivered") return deliveredEvidence;
    return tasks;
  }, [tasks, pendingEvidence, deliveredEvidence, activeFilter]);

  function openUploader(taskId: string) {
    setSelectedTaskId(taskId);
    setNoteText("");
    setMessage(null);
  }

  function closeUploader() {
    setSelectedTaskId(null);
    setNoteText("");
  }

  async function handleSubmitEvidence() {
    if (!selectedTaskId) return;
    if (!noteText.trim()) {
      setMessage("Escribe una nota describiendo la evidencia.");
      return;
    }
    setSending(true);

    // Optimistic update
    const snapshot = tasks;
    setTasks((current) =>
      current.map((t) =>
        t.id === selectedTaskId
          ? {
              ...t,
              status: "DONE" as const,
              completedAt: t.completedAt ?? "Ahora",
              photoStatus: "Foto enviada",
              evidenceUrl: `text://${noteText.trim()}`,
            }
          : t
      )
    );
    closeUploader();
    setMessage("Evidencia guardada correctamente.");

    // Try to send to API
    try {
      await apiFetch("/api/tasks", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({
          taskId: selectedTaskId,
          status: "DONE",
          evidenceUrl: `text://${noteText.trim()}`,
        }),
      });
    } catch {
      // Revert on failure
      setTasks(snapshot);
      setMessage("No pudimos guardar la evidencia.");
    }
    setSending(false);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#f5f0ea]">
        <AppHeader viewerInitials={viewerInitials} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0D7655" />
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
        {/* ── Hero card ─────────────────────────────────────── */}
        <View
          className="overflow-hidden rounded-[28px] px-6 py-5"
          style={{ backgroundColor: "#1b2d28" }}
        >
          <Text className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Evidencias
          </Text>
          <Text className="mt-1 text-xl font-extrabold text-white">
            Tus fotos de cierre
          </Text>
          <Text className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Aquí tienes claro qué tareas aún necesitan foto y cuáles ya quedaron respaldadas.
          </Text>

          <View className="mt-4 flex-row gap-2">
            <View className="flex-1 items-center rounded-2xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Pendientes</Text>
              <Text className="mt-1 text-xl font-bold text-white">{pendingEvidence.length}</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Enviadas</Text>
              <Text className="mt-1 text-xl font-bold text-white">{deliveredEvidence.length}</Text>
            </View>
          </View>
        </View>

        {/* ── Message banner ────────────────────────────────── */}
        {message && (
          <View className="rounded-[18px] bg-white px-4 py-3" style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
            <Text className="text-sm text-neutral-700">{message}</Text>
          </View>
        )}

        {/* ── Filter tabs ───────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 py-0.5">
            {([
              { id: "all" as const,       label: "Todas" },
              { id: "pending" as const,   label: "Por subir" },
              { id: "delivered" as const,  label: "Ya enviadas" },
            ]).map(({ id, label }) => {
              const active = activeFilter === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setActiveFilter(id)}
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: active ? "#0D7655" : "white" }}
                  activeOpacity={0.8}
                >
                  <Text className="text-sm font-semibold" style={{ color: active ? "white" : "#a3a3a3" }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Por subir section ─────────────────────────────── */}
        {(activeFilter === "all" || activeFilter === "pending") && (
          <View
            className="overflow-hidden rounded-[28px] bg-white"
            style={{ shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}
          >
            <View className="px-5 pt-5 pb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Por subir</Text>
              <Text className="mt-0.5 text-xs text-neutral-400">Tareas que aún piden foto</Text>
            </View>

            {pendingEvidence.length === 0 ? (
              <View className="items-center py-6 pb-5">
                <Text className="text-sm text-neutral-400">No tienes evidencias pendientes ahora mismo.</Text>
              </View>
            ) : (
              <View className="px-5 pb-5 gap-2">
                {pendingEvidence.map((task) => (
                  <View
                    key={task.id}
                    className="rounded-[18px] p-4"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-[#101111]" numberOfLines={1}>{task.title}</Text>
                        <Text className="mt-0.5 text-xs text-neutral-400">{task.photoStatus}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openUploader(task.id)}
                        className="rounded-full bg-[#101111] px-4 py-2"
                        activeOpacity={0.8}
                      >
                        <Text className="text-xs font-semibold text-white">Subir foto</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Ya enviadas section ───────────────────────────── */}
        {(activeFilter === "all" || activeFilter === "delivered") && (
          <View
            className="overflow-hidden rounded-[28px] bg-white"
            style={{ shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}
          >
            <View className="px-5 pt-5 pb-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Ya enviadas</Text>
              <Text className="mt-0.5 text-xs text-neutral-400">Respaldo listo para revisión</Text>
            </View>

            {deliveredEvidence.length === 0 ? (
              <View className="items-center py-6 pb-5">
                <Text className="text-sm text-neutral-400">Todavía no has enviado evidencias.</Text>
              </View>
            ) : (
              <View className="px-5 pb-5 gap-2">
                {deliveredEvidence.map((task) => (
                  <View
                    key={task.id}
                    className="rounded-[18px] p-4"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-[#101111]" numberOfLines={1}>{task.title}</Text>
                        <Text className="mt-0.5 text-xs text-neutral-400">
                          {task.completedAt ?? "Cerrada recientemente"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openUploader(task.id)}
                        className="rounded-full bg-white px-4 py-2"
                        style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}
                        activeOpacity={0.8}
                      >
                        <Text className="text-xs font-semibold text-neutral-600">Reemplazar</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Evidence indicator */}
                    <View className="mt-2 flex-row items-center gap-2 rounded-[12px] bg-[#0D7655]/[0.06] px-3 py-2">
                      <Text className="text-[#0D7655] text-xs">✓</Text>
                      <Text className="text-xs text-[#0D7655] font-medium">Foto enviada</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Upload/evidence modal ───────────────────────────── */}
      <Modal
        visible={selectedTaskId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeUploader}
      >
        <View className="flex-1 bg-[#f5f0ea]">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Subir evidencia</Text>
              <Text className="mt-1 text-lg font-bold text-[#101111]">Foto de cierre de tarea</Text>
            </View>
            <TouchableOpacity onPress={closeUploader}>
              <Text className="text-sm font-medium text-neutral-400">Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
            <View className="gap-4">
              {/* Selected task info */}
              {(() => {
                const task = tasks.find((t) => t.id === selectedTaskId);
                if (!task) return null;
                return (
                  <View className="rounded-[18px] bg-white p-4" style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}>
                    <Text className="text-sm font-semibold text-[#101111]">{task.title}</Text>
                    {task.instructions ? (
                      <Text className="mt-1 text-xs text-neutral-500 leading-5">{task.instructions}</Text>
                    ) : null}
                    <Text className="mt-1 text-[10px] text-neutral-300">{task.photoStatus}</Text>
                  </View>
                );
              })()}

              {/* Note input (since RN can't do file picker without expo-image-picker) */}
              <View>
                <Text className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                  Describe la evidencia
                </Text>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#101111]"
                  placeholder="Ej: Cocina limpia, estufa desinfectada, fotos tomadas…"
                  placeholderTextColor="#ccc"
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                />
              </View>

              {/* Info note */}
              <View className="rounded-[14px] bg-[#0D7655]/[0.06] px-4 py-3">
                <Text className="text-xs text-[#0D7655] leading-5">
                  💡 En la próxima actualización podrás adjuntar fotos directamente desde tu cámara.
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmitEvidence}
                disabled={!noteText.trim() || sending}
                className="rounded-full bg-[#0D7655] py-4 items-center"
                style={{ opacity: (!noteText.trim() || sending) ? 0.5 : 1 }}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Guardar evidencia</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

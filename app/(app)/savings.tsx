import { useCallback, useEffect, useState } from "react";
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
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";

import { AppHeader } from "@/components/shell/AppHeader";
import { useSession } from "@/lib/contexts/session-context";
import { apiFetch } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────────────

type SavingsGoal = {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  emoji: string;
};

type SavingsData = {
  available: number;
  saved: number;
  weeklyAmount: number;
  goals: SavingsGoal[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

const GOAL_EMOJIS = ["🎯", "🎮", "📱", "👟", "🎸", "📚", "🚲", "🎒", "💻", "🎧", "⚽", "🎨"];

// ── Screen ─────────────────────────────────────────────────────────────────

export default function SavingsScreen() {
  const { session } = useSession();

  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", targetAmount: "", emoji: "🎯" });

  const viewerInitials = (session?.name ?? "")
    .split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const d = await apiFetch<{ savings?: { available?: number; saved?: number; weeklyAmount?: number } }>("/api/dashboard", { token: session.token });
      const s = d.savings ?? {};
      setData({
        available: s.available ?? 0,
        saved: s.saved ?? 0,
        weeklyAmount: s.weeklyAmount ?? 0,
        goals: data?.goals ?? [
          { id: "g1", title: "Audífonos nuevos", targetAmount: 150000, savedAmount: 45000, emoji: "🎧" },
          { id: "g2", title: "Videojuego", targetAmount: 200000, savedAmount: 120000, emoji: "🎮" },
          { id: "g3", title: "Ahorro libre", targetAmount: 500000, savedAmount: 80000, emoji: "🎯" },
        ],
      });
    } catch {
      // Use fallback demo data
      if (!data) {
        setData({
          available: 25000,
          saved: 245000,
          weeklyAmount: 15000,
          goals: [
            { id: "g1", title: "Audífonos nuevos", targetAmount: 150000, savedAmount: 45000, emoji: "🎧" },
            { id: "g2", title: "Videojuego", targetAmount: 200000, savedAmount: 120000, emoji: "🎮" },
            { id: "g3", title: "Ahorro libre", targetAmount: 500000, savedAmount: 80000, emoji: "🎯" },
          ],
        });
      }
    }
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

  function handleAddGoal() {
    if (!newGoal.title || !newGoal.targetAmount || !data) return;
    const goal: SavingsGoal = {
      id: `g-${Date.now()}`,
      title: newGoal.title,
      targetAmount: Number(newGoal.targetAmount),
      savedAmount: 0,
      emoji: newGoal.emoji,
    };
    setData({ ...data, goals: [...data.goals, goal] });
    setNewGoal({ title: "", targetAmount: "", emoji: "🎯" });
    setShowAddGoal(false);
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

  const totalSaved = data?.saved ?? 0;
  const available = data?.available ?? 0;
  const weeklyAmount = data?.weeklyAmount ?? 0;
  const goals = data?.goals ?? [];
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalGoalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const overallPct = totalGoalTarget > 0 ? Math.min(Math.round((totalGoalSaved / totalGoalTarget) * 100), 100) : 0;

  const ringSize = 140;
  const ringCx = ringSize / 2;
  const ringCy = ringSize / 2;
  const ringR = 56;
  const ringStroke = 10;
  const ringEndAngle = (overallPct / 100) * 360;

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
        <View className="overflow-hidden rounded-[28px] bg-[#0D7655] px-6 py-6">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Mi ahorro</Text>
          <Text className="mt-1 text-2xl font-extrabold text-white">{formatCurrency(totalSaved)}</Text>
          <Text className="mt-0.5 text-sm text-white/60">
            {formatCurrency(available)} disponible · {formatCurrency(weeklyAmount)}/semana
          </Text>

          {/* Mini stats */}
          <View className="mt-4 flex-row gap-2">
            {[
              { label: "Disponible", value: formatCurrency(available) },
              { label: "Ahorrado", value: formatCurrency(totalSaved) },
              { label: "Mesada", value: formatCurrency(weeklyAmount) },
            ].map((s) => (
              <View key={s.label} className="flex-1 items-center rounded-2xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <Text className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</Text>
                <Text className="mt-1 text-sm font-bold text-white">{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Progress ring + goals ─────────────────────────── */}
        <View
          className="overflow-hidden rounded-[28px] bg-white"
          style={{ shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}
        >
          <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Progreso de metas</Text>
              <Text className="mt-0.5 text-xs text-neutral-400">{goals.length} meta{goals.length !== 1 ? "s" : ""} activa{goals.length !== 1 ? "s" : ""}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddGoal(true)}
              className="rounded-full bg-[#0D7655]/10 px-3 py-1.5"
              activeOpacity={0.7}
            >
              <Text className="text-[11px] font-semibold text-[#0D7655]">+ Nueva meta</Text>
            </TouchableOpacity>
          </View>

          {/* Ring */}
          <View className="items-center py-4">
            <View style={{ width: ringSize, height: ringSize, alignItems: "center", justifyContent: "center" }}>
              <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                <SvgCircle cx={ringCx} cy={ringCy} r={ringR} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={ringStroke} />
                {overallPct > 0 && (
                  overallPct >= 100 ? (
                    <SvgCircle cx={ringCx} cy={ringCy} r={ringR} fill="none" stroke="#0D7655" strokeWidth={ringStroke} strokeLinecap="round" />
                  ) : (
                    <SvgPath d={describeArc(ringCx, ringCy, ringR, 0, ringEndAngle)} fill="none" stroke="#0D7655" strokeWidth={ringStroke} strokeLinecap="round" />
                  )
                )}
              </Svg>
              <View style={{ position: "absolute" }} className="items-center">
                <Text className="text-3xl font-bold text-[#101111]">{overallPct}%</Text>
                <Text className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-400">Total</Text>
              </View>
            </View>
          </View>

          {/* Goals list */}
          <View className="px-5 pb-5 gap-2">
            {goals.map((goal) => {
              const pct = goal.targetAmount > 0 ? Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100) : 0;
              return (
                <View
                  key={goal.id}
                  className="rounded-[18px] p-4"
                  style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", backgroundColor: pct >= 100 ? "rgba(13,118,85,0.05)" : "white" }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f5f0ea]">
                      <Text className="text-lg">{goal.emoji}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-[#101111]" numberOfLines={1}>{goal.title}</Text>
                      <Text className="text-[11px] text-neutral-400">
                        {formatCurrency(goal.savedAmount)} de {formatCurrency(goal.targetAmount)}
                      </Text>
                    </View>
                    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: pct >= 100 ? "rgba(13,118,85,0.1)" : "rgba(255,106,0,0.1)" }}>
                      <Text className="text-[10px] font-bold" style={{ color: pct >= 100 ? "#0D7655" : "#FF6A00" }}>{pct}%</Text>
                    </View>
                  </View>
                  <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0ebe3]">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: pct >= 100 ? "#0D7655" : "#FF6A00" }}
                    />
                  </View>
                </View>
              );
            })}
            {goals.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-3xl mb-2">🎯</Text>
                <Text className="text-sm text-neutral-400">Sin metas de ahorro aún</Text>
                <TouchableOpacity onPress={() => setShowAddGoal(true)} activeOpacity={0.7}>
                  <Text className="mt-2 text-[11px] font-semibold text-[#0D7655]">Crear mi primera meta →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── Tips card ─────────────────────────────────────── */}
        <View
          className="rounded-[24px] bg-white p-5"
          style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        >
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0D7655]">Consejos de ahorro</Text>
          <View className="mt-3 gap-2">
            {[
              { emoji: "💡", tip: "Guarda al menos el 20% de tu mesada cada semana" },
              { emoji: "🎯", tip: "Divide metas grandes en pasos pequeños" },
              { emoji: "📊", tip: "Revisa tu progreso cada semana para mantener el hábito" },
            ].map((item) => (
              <View key={item.tip} className="flex-row items-start gap-3 rounded-[14px] bg-[#f5f0ea] p-3">
                <Text className="text-base">{item.emoji}</Text>
                <Text className="flex-1 text-xs text-neutral-600 leading-5">{item.tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Add goal modal ──────────────────────────────────── */}
      <Modal visible={showAddGoal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddGoal(false)}>
        <View className="flex-1 bg-[#f5f0ea]">
          <View className="flex-row items-center justify-between px-5 pt-6 pb-4">
            <Text className="text-lg font-bold text-[#101111]">Nueva meta de ahorro</Text>
            <TouchableOpacity onPress={() => setShowAddGoal(false)}>
              <Text className="text-sm font-medium text-neutral-400">Cancelar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
            <View className="gap-4">
              {/* Emoji picker */}
              <View>
                <Text className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">Ícono</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {GOAL_EMOJIS.map((e) => (
                      <TouchableOpacity
                        key={e}
                        onPress={() => setNewGoal((c) => ({ ...c, emoji: e }))}
                        className="h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: newGoal.emoji === e ? "rgba(13,118,85,0.15)" : "#f0ebe3", borderWidth: newGoal.emoji === e ? 2 : 0, borderColor: "#0D7655" }}
                        activeOpacity={0.7}
                      >
                        <Text className="text-xl">{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View>
                <Text className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">Nombre de la meta</Text>
                <TextInput
                  value={newGoal.title}
                  onChangeText={(v) => setNewGoal((c) => ({ ...c, title: v }))}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#101111]"
                  placeholder="Ej: Audífonos, videojuego…"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">Monto objetivo ($)</Text>
                <TextInput
                  value={newGoal.targetAmount}
                  onChangeText={(v) => setNewGoal((c) => ({ ...c, targetAmount: v.replace(/[^0-9]/g, "") }))}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#101111]"
                  placeholder="150000"
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                onPress={handleAddGoal}
                className="rounded-full bg-[#0D7655] py-4 items-center"
                style={{ opacity: (!newGoal.title || !newGoal.targetAmount) ? 0.5 : 1 }}
                activeOpacity={0.8}
                disabled={!newGoal.title || !newGoal.targetAmount}
              >
                <Text className="text-sm font-semibold text-white">Crear meta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

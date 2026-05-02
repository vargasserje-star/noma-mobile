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
import { useFocusEffect } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";

import { AppHeader } from "@/components/shell/AppHeader";
import { apiFetch } from "@/lib/api/client";
import { useSession } from "@/lib/contexts/session-context";
import type { MealSummary, ShoppingSummary } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

const MEAL_TYPES = ["Desayuno", "Almuerzo", "Cena"] as const;
const WEEKDAY_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] as const;

type MealType = (typeof MEAL_TYPES)[number];
type PlannerTab = "ai" | "manual";
type ManualDraft = { isoDate: string; type: MealType; title: string; notes: string };
type NewItemDraft = { title: string; quantity: string };
type RecipeCard = { id: string; title: string; prepTime?: string; source: "manual" | "ai" };
type PlannerDraft = { prompt: string; avoid: string; maxPrepMinutes: string };
type CalCell = { iso: string; num: number; inMonth: boolean; isToday: boolean };

const breakfastImage = require("@/assets/images/menu-breakfast.webp");
const lunchImage = require("@/assets/images/menu-lunch.webp");
const dinnerImage = require("@/assets/images/menu-dinner.webp");

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, weeks: number) {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
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

function formatWeekRange(weekStart: string) {
  const s = new Date(`${weekStart}T12:00:00Z`);
  const e = new Date(`${weekStart}T12:00:00Z`);
  e.setUTCDate(e.getUTCDate() + 6);
  const sDay = s.getUTCDate();
  const sMon = s.toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" }).replace(".", "");
  const eDay = e.getUTCDate();
  const eMon = e.toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" }).replace(".", "");
  const eYear = e.getUTCFullYear();
  if (s.getUTCMonth() === e.getUTCMonth()) return `${sDay}–${eDay} ${eMon} ${eYear}`;
  return `${sDay} ${sMon} – ${eDay} ${eMon} ${eYear}`;
}

function formatDayAbbrev(iso: string) {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { weekday: "short", timeZone: "UTC" })
    .replace(".", "").toUpperCase().slice(0, 3);
}

function formatDayNum(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDate();
}

function formatFullDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

function formatMonthTitle(iso: string) {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" })
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

// Normalize legacy day-name meals (e.g. "Lunes") to ISO dates for the current week
const DAY_NAME_TO_INDEX: Record<string, number> = {
  lunes: 0, martes: 1, miercoles: 2, miércoles: 2,
  jueves: 3, viernes: 4, sabado: 5, sábado: 5, domingo: 6,
};

function normalizeMealDay(day: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const index = DAY_NAME_TO_INDEX[day.toLowerCase()];
  if (index === undefined) return getTodayIso();
  const weekStart = getWeekStart(getTodayIso());
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SparkIcon({ color = "white" }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1L7.9 5.1L12 7L7.9 8.9L7 13L6.1 8.9L2 7L6.1 5.1L7 1Z" fill={color} />
    </Svg>
  );
}

function BreakfastIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 2v3M10 2v3M14 2v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function LunchIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function DinnerIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ color = "#C1BBB4" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EmptyRecipeIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#C7C0B9" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="#C7C0B9" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function mealTypeIcon(type: MealType, color: string) {
  if (type === "Desayuno") return <BreakfastIcon color={color} />;
  if (type === "Almuerzo") return <LunchIcon color={color} />;
  return <DinnerIcon color={color} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShoppingRow({ item, onToggle }: { item: ShoppingSummary; onToggle: (id: string) => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onToggle(item.id)}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 12 }}
    >
      <View
        style={{
          width: 24, height: 24, borderRadius: 12, borderWidth: 2,
          borderColor: item.checked ? "#2E7B5E" : "rgba(0,0,0,0.2)",
          backgroundColor: item.checked ? "#2E7B5E" : "transparent",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {item.checked && (
          <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
            <Path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <Text
        style={{
          flex: 1, fontSize: 13, fontWeight: "500",
          color: item.checked ? "#A8A8A8" : "#101111",
          textDecorationLine: item.checked ? "line-through" : "none",
        }}
      >
        {item.title}
      </Text>
      {!!item.quantity && (
        <Text style={{ fontSize: 11, fontWeight: "500", color: "#A7A7A7", flexShrink: 0 }}>{item.quantity}</Text>
      )}
    </TouchableOpacity>
  );
}

// Mini calendar picker (reusable inside modal)
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
            <TouchableOpacity
              key={cell.iso}
              onPress={() => onSelectDate(cell.iso)}
              activeOpacity={0.8}
              style={{ width: "14.285%", paddingVertical: 3, alignItems: "center", opacity: cell.inMonth ? 1 : 0.28 }}
            >
              <View
                style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: sel ? "#0D7655" : cell.isToday ? "rgba(13,118,85,0.12)" : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}
              >
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MenusScreen() {
  const { session } = useSession();

  const todayIso = useMemo(() => getTodayIso(), []);

  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [shopping, setShopping] = useState<ShoppingSummary[]>([]);
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [visibleWeekStart, setVisibleWeekStart] = useState(getWeekStart(todayIso));

  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerTab, setPlannerTab] = useState<PlannerTab>("ai");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  const [manualDraft, setManualDraft] = useState<ManualDraft>({
    isoDate: todayIso, type: "Almuerzo", title: "", notes: "",
  });
  const [manualPickerMonth, setManualPickerMonth] = useState(startOfMonth(todayIso));

  const [plannerDraft, setPlannerDraft] = useState<PlannerDraft>({
    prompt: "Comidas familiares prácticas para la semana", avoid: "", maxPrepMinutes: "40",
  });
  const [itemDraft, setItemDraft] = useState<NewItemDraft>({ title: "", quantity: "" });
  const [recipeDraft, setRecipeDraft] = useState({ name: "", prepTime: "", ingredients: "", steps: "", notes: "" });

  const [saving, setSaving] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: { meals?: MealSummary[]; shopping?: ShoppingSummary[] } }>(
        "/api/meals",
        { token: session.token },
      );
      const d = raw.data ?? (raw as any);
      const normalized = (d.meals ?? []).map((m: MealSummary) => ({ ...m, day: normalizeMealDay(m.day) }));
      setMeals(normalized);
      setShopping(d.shopping ?? []);
    } catch {}
    setLoading(false);
  }, [session?.token]);

  useEffect(() => { void loadData(); }, [loadData]);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Derived state ────────────────────────────────────────────────────────────

  const viewerInitials = (session?.name ?? "").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  const weekDates = useMemo(() => getWeekDates(visibleWeekStart), [visibleWeekStart]);

  const daysWithMeals = useMemo(() => new Set(meals.map((m) => m.day)), [meals]);

  const plannedThisWeek = useMemo(
    () => weekDates.filter((iso) => daysWithMeals.has(iso)).length,
    [weekDates, daysWithMeals]
  );

  const selectedDayMeals = useMemo(
    () => meals.filter((m) => m.day === selectedDay),
    [meals, selectedDay]
  );

  const weekOverview = useMemo(
    () => weekDates.map((iso) => ({ iso, dayMeals: meals.filter((m) => m.day === iso) })),
    [weekDates, meals]
  );

  const checkedCount = useMemo(() => shopping.filter((s) => s.checked).length, [shopping]);
  const shoppingPct = shopping.length ? Math.round((checkedCount / shopping.length) * 100) : 0;
  const uncheckedItems = useMemo(() => shopping.filter((s) => !s.checked), [shopping]);
  const checkedItems = useMemo(() => shopping.filter((s) => s.checked), [shopping]);

  const breakfast = selectedDayMeals.find((m) => m.type === "Desayuno");
  const lunch = selectedDayMeals.find((m) => m.type === "Almuerzo");
  const dinner = selectedDayMeals.find((m) => m.type === "Cena");

  // ── Actions ─────────────────────────────────────────────────────────────────

  function openManual(isoDate: string, type: MealType, prefill = "") {
    setManualDraft({ isoDate, type, title: prefill, notes: "" });
    setManualPickerMonth(startOfMonth(isoDate));
    setPlannerTab("manual");
    setShowPlanner(true);
  }

  async function handleSaveMeal() {
    if (!manualDraft.title.trim()) return;
    setSaving(true);
    const newMeal: MealSummary = {
      id: `meal-${Date.now()}`,
      day: manualDraft.isoDate,
      type: manualDraft.type,
      title: manualDraft.title.trim(),
    };
    setMeals((cur) => {
      const filtered = cur.filter((m) => !(m.day === manualDraft.isoDate && m.type === manualDraft.type));
      return [...filtered, newMeal];
    });
    // Navigate to the saved date's week
    setVisibleWeekStart(getWeekStart(manualDraft.isoDate));
    setSelectedDay(manualDraft.isoDate);
    try {
      await apiFetch("/api/meals", {
        method: "POST",
        token: session?.token,
        body: JSON.stringify({
          action: "add_meal",
          householdId: session?.householdId ?? "demo-household-1",
          day: manualDraft.isoDate,
          type: manualDraft.type,
          title: manualDraft.title.trim(),
          notes: manualDraft.notes,
        }),
      });
    } catch {}
    setSaving(false);
    setShowPlanner(false);
  }

  async function handleDeleteMeal(meal: MealSummary) {
    setMeals((cur) => cur.filter((m) => m.id !== meal.id));
    try {
      await apiFetch("/api/meals", {
        method: "DELETE",
        token: session?.token,
        body: JSON.stringify({
          mealId: meal.id,
          householdId: session?.householdId ?? "demo-household-1",
        }),
      });
    } catch {
      setMeals((cur) => [...cur, meal]);
    }
  }

  async function handleGeneratePlan() {
    if (!session) return;
    setGeneratingPlan(true);
    try {
      const result = await apiFetch<{ data: { meals?: MealSummary[]; shopping?: ShoppingSummary[]; recipes?: RecipeCard[] } }>("/api/meals", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({
          action: "generate_plan",
          weekStart: visibleWeekStart,
          householdId: session.householdId,
          householdName: session.householdName,
          prompt: plannerDraft.prompt,
          avoid: plannerDraft.avoid,
          maxPrepMinutes: Number(plannerDraft.maxPrepMinutes) || 40,
        }),
      });
      const newMeals = (result?.data?.meals ?? []).map((m) => ({ ...m, day: normalizeMealDay(m.day) }));
      const newShopping = result?.data?.shopping ?? [];
      const aiRecipes = (result?.data?.recipes ?? []).map((r) => ({ ...r, source: "ai" as const }));
      if (newMeals.length) setMeals(newMeals);
      if (newShopping.length) setShopping(newShopping);
      if (aiRecipes.length) {
        setRecipes((c) => {
          const existing = new Set(c.map((r) => r.title.toLowerCase()));
          return [...c, ...aiRecipes.filter((r) => !existing.has(r.title.toLowerCase()))];
        });
      }
      if (newMeals[0]?.day) {
        setSelectedDay(newMeals[0].day);
        setVisibleWeekStart(getWeekStart(newMeals[0].day));
      }
    } catch {}
    setGeneratingPlan(false);
    setShowPlanner(false);
  }

  async function handleToggleShopping(itemId: string) {
    const current = shopping.find((s) => s.id === itemId);
    if (!current) return;
    const newChecked = !current.checked;
    setShopping((cur) => cur.map((item) => (item.id === itemId ? { ...item, checked: newChecked } : item)));
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
      setShopping((cur) => cur.map((item) => (item.id === itemId ? { ...item, checked: !newChecked } : item)));
    }
  }

  async function handleAddItem() {
    if (!itemDraft.title.trim()) return;
    setSaving(true);
    const newItem: ShoppingSummary = {
      id: `item-${Date.now()}`,
      title: itemDraft.title.trim(),
      quantity: itemDraft.quantity.trim(),
      checked: false,
    };
    setShopping((cur) => [newItem, ...cur]);
    try {
      await apiFetch("/api/meals", {
        method: "POST",
        token: session?.token,
        body: JSON.stringify({
          action: "add_item",
          householdId: session?.householdId ?? "demo-household-1",
          title: newItem.title,
          quantity: newItem.quantity || "",
          source: "manual",
        }),
      });
    } catch {}
    setSaving(false);
    setShowAddItem(false);
    setItemDraft({ title: "", quantity: "" });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
        contentContainerStyle={{ padding: 16, paddingBottom: 34, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7655" />}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: "#101111" }}>Menús</Text>
            <Text style={{ marginTop: 3, fontSize: 12, color: "#757575" }}>
              <Text style={{ fontWeight: "700", color: "#2E7B5E" }}>{plannedThisWeek}</Text>
              {" días planeados esta semana · "}
              <Text style={{ fontWeight: "700", color: "#2E7B5E" }}>{shopping.length}</Text>
              {" productos"}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => { setPlannerTab("ai"); setShowPlanner(true); }}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11,
              backgroundColor: "#F97920",
              shadowColor: "#F97920", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
            }}
          >
            <SparkIcon />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "white" }}>Planear menú</Text>
          </TouchableOpacity>
        </View>

        {/* ── Week navigator + day meals ── */}
        <View style={{ overflow: "hidden", borderRadius: 28, backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>

          {/* Week navigation header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <TouchableOpacity
              onPress={() => setVisibleWeekStart(shiftWeek(visibleWeekStart, -1))}
              activeOpacity={0.8}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 18, color: "#666" }}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setVisibleWeekStart(getWeekStart(todayIso)); setSelectedDay(todayIso); }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{formatWeekRange(visibleWeekStart)}</Text>
              <Text style={{ marginTop: 1, fontSize: 10, color: "#0D7655", fontWeight: "600", textAlign: "center" }}>
                {visibleWeekStart === getWeekStart(todayIso) ? "Esta semana" : "Ir a hoy →"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setVisibleWeekStart(shiftWeek(visibleWeekStart, 1))}
              activeOpacity={0.8}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 18, color: "#666" }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day columns */}
          <View style={{ flexDirection: "row", paddingHorizontal: 6, paddingBottom: 10 }}>
            {weekDates.map((iso) => {
              const active = selectedDay === iso;
              const hasFood = daysWithMeals.has(iso);
              const isToday = iso === todayIso;
              return (
                <TouchableOpacity
                  key={iso}
                  onPress={() => setSelectedDay(iso)}
                  activeOpacity={0.82}
                  style={{
                    flex: 1, alignItems: "center", paddingTop: 10, paddingBottom: 8,
                    borderRadius: 16,
                    backgroundColor: active ? "#0D7655" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.6, color: active ? "rgba(255,255,255,0.7)" : isToday ? "#0D7655" : "#A9A29B" }}>
                    {formatDayAbbrev(iso)}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 15, fontWeight: "700", lineHeight: 20, color: active ? "white" : isToday ? "#0D7655" : "#101111" }}>
                    {formatDayNum(iso)}
                  </Text>
                  <View style={{ marginTop: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: active ? "#FF6A00" : hasFood ? "#0D7655" : "transparent" }} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected day meals */}
          <View style={{ borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0D7655" }}>
                {formatFullDate(selectedDay)}
              </Text>
              {selectedDayMeals.length > 0 && (
                <TouchableOpacity onPress={() => openManual(selectedDay, "Almuerzo")} activeOpacity={0.8}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#F97920" }}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Desayuno */}
            {breakfast ? (
              <View style={{ overflow: "hidden", borderRadius: 18, backgroundColor: "#F0F6F2", flexDirection: "row", alignItems: "flex-end", marginBottom: 12 }}>
                <View style={{ flex: 1, padding: 16 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <BreakfastIcon color="#0D7655" />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Desayuno</Text>
                  <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "700", color: "#101111" }}>{breakfast.title}</Text>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => openManual(selectedDay, "Desayuno", breakfast.title)} activeOpacity={0.8}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D7655" }}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMeal(breakfast)} activeOpacity={0.8}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#C05050" }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Image source={breakfastImage} resizeMode="contain" style={{ width: 112, height: 90, marginRight: 8 }} />
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => openManual(selectedDay, "Desayuno")}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderStyle: "dashed", paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3EEEA", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BreakfastIcon color="#bbb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A29B" }}>Desayuno</Text>
                  <Text style={{ marginTop: 4, fontSize: 13, color: "#B1AFAE" }}>Agrega tu desayuno</Text>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F3EEEA", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Text style={{ fontSize: 16, color: "#B8B3AD", lineHeight: 20 }}>+</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Almuerzo + Cena */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              {([{ type: "Almuerzo" as const, meal: lunch }, { type: "Cena" as const, meal: dinner }]).map(({ type, meal }) => {
                const isLunch = type === "Almuerzo";
                const bg = isLunch ? "#FFF4EA" : "#EEF6F3";
                const accent = isLunch ? "#FF6A00" : "#0D7655";
                const illustration = isLunch ? lunchImage : dinnerImage;

                return meal ? (
                  <View key={type} style={{ flex: 1, overflow: "hidden", borderRadius: 18, backgroundColor: bg }}>
                    <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                        {mealTypeIcon(type, accent)}
                      </View>
                      <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: accent }}>{type}</Text>
                      <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "700", lineHeight: 18, color: "#101111" }}>{meal.title}</Text>
                      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                        <TouchableOpacity onPress={() => openManual(selectedDay, type, meal.title)} activeOpacity={0.8}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteMeal(meal)} activeOpacity={0.8}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: "#C05050" }}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", paddingRight: 6, paddingBottom: 6 }}>
                      <Image source={illustration} resizeMode="contain" style={{ width: 110, height: 86 }} />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.82}
                    onPress={() => openManual(selectedDay, type)}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderStyle: "dashed", paddingVertical: 28, gap: 8 }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3EEEA", alignItems: "center", justifyContent: "center" }}>
                      {mealTypeIcon(type, "#B8B3AD")}
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#A7A29B" }}>{type}</Text>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#F3EEEA", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 14, color: "#B8B3AD", lineHeight: 18 }}>+</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Week overview ── */}
        <View style={{ overflow: "hidden", borderRadius: 28, backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#2E7B5E" }}>
              {visibleWeekStart === getWeekStart(todayIso) ? "Esta semana" : formatWeekRange(visibleWeekStart)}
            </Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => { setPlannerTab("manual"); setShowPlanner(true); }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#F97920" }}>+ Agregar comida</Text>
            </TouchableOpacity>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)" }}>
            {weekOverview.map(({ iso, dayMeals }, idx) => {
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDay;
              const almuerzo = dayMeals.find((m) => m.type === "Almuerzo");
              const cena = dayMeals.find((m) => m.type === "Cena");
              const desayuno = dayMeals.find((m) => m.type === "Desayuno");

              return (
                <TouchableOpacity
                  key={iso}
                  activeOpacity={0.82}
                  onPress={() => setSelectedDay(iso)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 20, paddingVertical: 13,
                    borderBottomWidth: idx < 6 ? 1 : 0,
                    borderBottomColor: "rgba(0,0,0,0.04)",
                    backgroundColor: isSelected ? "rgba(13,118,85,0.04)" : "transparent",
                  }}
                >
                  <View style={{ width: 46 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: isToday ? "#2E7B5E" : "#101111" }}>
                      {formatDayAbbrev(iso)}
                    </Text>
                    <Text style={{ fontSize: 11, color: isToday ? "#2E7B5E" : "#A9A29B" }}>
                      {formatDayNum(iso)}
                    </Text>
                  </View>

                  {dayMeals.length > 0 ? (
                    <View style={{ flex: 1, gap: 3 }}>
                      {desayuno && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#5CB98B", flexShrink: 0 }} />
                          <Text style={{ fontSize: 11, color: "#686868" }} numberOfLines={1}>{desayuno.title}</Text>
                        </View>
                      )}
                      {almuerzo && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#F5B65C", flexShrink: 0 }} />
                          <Text style={{ fontSize: 11, color: "#686868" }} numberOfLines={1}>{almuerzo.title}</Text>
                        </View>
                      )}
                      {cena && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#9BAEC8", flexShrink: 0 }} />
                          <Text style={{ fontSize: 11, color: "#8D8D8D" }} numberOfLines={1}>{cena.title}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={{ flex: 1, fontSize: 11, color: "#CACACA", fontStyle: "italic" }}>Sin comidas planeadas</Text>
                  )}

                  {dayMeals.length === 0 ? (
                    <TouchableOpacity
                      onPress={() => openManual(iso, "Almuerzo")}
                      activeOpacity={0.8}
                      style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#F3EEE8", alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 14, color: "#B8B3AD", lineHeight: 18 }}>+</Text>
                    </TouchableOpacity>
                  ) : (
                    <ChevronRight />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Lista de mercado ── */}
        <View style={{ overflow: "hidden", borderRadius: 28, backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#2E7B5E" }}>Lista de mercado</Text>
              {shopping.length > 0 && (
                <Text style={{ marginTop: 3, fontSize: 13, color: "#101111" }}>
                  <Text style={{ fontWeight: "800" }}>{checkedCount}</Text>
                  {" de "}
                  <Text style={{ fontWeight: "800" }}>{shopping.length}</Text>
                  <Text style={{ color: "#A8A8A8", fontWeight: "400" }}> listos</Text>
                </Text>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setShowAddItem(true)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(13,118,85,0.10)", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 20, color: "#2E7B5E", fontWeight: "300", lineHeight: 24 }}>+</Text>
            </TouchableOpacity>
          </View>

          {shopping.length > 0 && (
            <View style={{ marginHorizontal: 20, marginTop: 12, marginBottom: 4, height: 6, borderRadius: 3, backgroundColor: "#F0E9E0", overflow: "hidden" }}>
              <View style={{ height: "100%", borderRadius: 3, backgroundColor: "#2E7B5E", width: `${Math.max(shoppingPct, shopping.length > 0 ? 3 : 0)}%` }} />
            </View>
          )}

          {shopping.length === 0 ? (
            <View style={{ alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F7F4F0", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#ccc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M3 6H21" stroke="#ccc" strokeWidth={1.8} strokeLinecap="round" />
                  <Path d="M16 10a4 4 0 0 1-8 0" stroke="#ccc" strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#A8A8A8" }}>Sin productos en la lista</Text>
            </View>
          ) : (
            <View style={{ paddingBottom: 12 }}>
              {uncheckedItems.map((item) => <ShoppingRow key={item.id} item={item} onToggle={handleToggleShopping} />)}
              {checkedItems.length > 0 && (
                <>
                  <Text style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "rgba(0,0,0,0.3)" }}>
                    En el carrito ({checkedItems.length})
                  </Text>
                  {checkedItems.map((item) => <ShoppingRow key={item.id} item={item} onToggle={handleToggleShopping} />)}
                </>
              )}
            </View>
          )}
        </View>

        {/* ── Recetas guardadas ── */}
        <View style={{ overflow: "hidden", borderRadius: 28, backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#2E7B5E" }}>Recetas guardadas</Text>
              <Text style={{ marginTop: 3, fontSize: 13, fontWeight: "500", color: "#101111" }}>
                {recipes.length === 0 ? "Sin recetas aún" : `${recipes.length} receta${recipes.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setShowAddRecipe(true)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(13,118,85,0.10)", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 20, color: "#2E7B5E", fontWeight: "300", lineHeight: 24 }}>+</Text>
            </TouchableOpacity>
          </View>

          {recipes.length === 0 ? (
            <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", borderStyle: "dashed", paddingVertical: 32, alignItems: "center" }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F7F4F0", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <EmptyRecipeIcon />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#A8A8A8" }}>Las recetas de IA se guardan aquí</Text>
              <Text style={{ marginTop: 4, fontSize: 11, color: "#A8A8A8" }}>o agrega las tuyas con +</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
              {recipes.map((recipe) => (
                <View key={recipe.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", backgroundColor: "#F7F4F0", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111" }} numberOfLines={1}>{recipe.title}</Text>
                    {recipe.prepTime ? <Text style={{ marginTop: 2, fontSize: 11, color: "#A8A8A8" }}>⏱ {recipe.prepTime}</Text> : null}
                  </View>
                  <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: recipe.source === "ai" ? "rgba(13,118,85,0.10)" : "rgba(0,0,0,0.07)" }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: recipe.source === "ai" ? "#0D7655" : "#666" }}>
                      {recipe.source === "ai" ? "IA" : "Manual"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════ */}

      {/* ── Planear menú modal ── */}
      <Modal visible={showPlanner} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPlanner(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Planear menú</Text>
            <TouchableOpacity onPress={() => setShowPlanner(false)} style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, color: "#8D8D8D" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ marginHorizontal: 20, marginBottom: 16, flexDirection: "row", gap: 4, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.6)", padding: 4 }}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setPlannerTab("ai")}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 9, backgroundColor: plannerTab === "ai" ? "#0D7655" : "transparent" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: plannerTab === "ai" ? "white" : "#A0A0A0" }}>✦ Con IA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setPlannerTab("manual")}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 9, backgroundColor: plannerTab === "manual" ? "white" : "transparent" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: plannerTab === "manual" ? "#101111" : "#A0A0A0" }}>✏ Manual</Text>
            </TouchableOpacity>
          </View>

          {/* ── AI tab ── */}
          {plannerTab === "ai" ? (
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 16, paddingBottom: 10 }}>
                <View style={{ borderRadius: 16, backgroundColor: "rgba(13,118,85,0.08)", paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 11, color: "#2E7B5E", fontWeight: "600" }}>
                    Generará el menú para: <Text style={{ fontWeight: "800" }}>{formatWeekRange(visibleWeekStart)}</Text>
                  </Text>
                </View>

                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>¿Qué tipo de comidas?</Text>
                  <TextInput
                    value={plannerDraft.prompt}
                    onChangeText={(v) => setPlannerDraft((c) => ({ ...c, prompt: v }))}
                    placeholder="Ej. Comidas colombianas tradicionales, balanceadas..."
                    placeholderTextColor="#B2B2B2"
                    multiline
                    numberOfLines={2}
                    style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: "#101111" }}
                  />
                </View>

                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>
                    Evitar <Text style={{ textTransform: "none", fontWeight: "400", color: "#A0A0A0" }}>(opcional)</Text>
                  </Text>
                  <TextInput
                    value={plannerDraft.avoid}
                    onChangeText={(v) => setPlannerDraft((c) => ({ ...c, avoid: v }))}
                    placeholder="Ej. mariscos, cerdo, picante..."
                    placeholderTextColor="#B2B2B2"
                    style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: "#101111" }}
                  />
                </View>

                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Tiempo máximo de preparación</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {["20", "40", "60"].map((min) => (
                      <TouchableOpacity
                        key={min}
                        onPress={() => setPlannerDraft((c) => ({ ...c, maxPrepMinutes: min }))}
                        activeOpacity={0.82}
                        style={{ flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center", backgroundColor: plannerDraft.maxPrepMinutes === min ? "#0D7655" : "white", borderWidth: plannerDraft.maxPrepMinutes === min ? 0 : 1, borderColor: "rgba(0,0,0,0.08)" }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: plannerDraft.maxPrepMinutes === min ? "white" : "#666" }}>{min} min</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleGeneratePlan}
                  disabled={generatingPlan}
                  style={{ borderRadius: 999, paddingVertical: 16, alignItems: "center", backgroundColor: "#F97920", opacity: generatingPlan ? 0.7 : 1, marginTop: 4, shadowColor: "#F97920", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
                >
                  {generatingPlan
                    ? <ActivityIndicator color="white" />
                    : <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>✦ Generar plan semanal</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>

          ) : (
            /* ── Manual tab ── */
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 18, paddingBottom: 32 }}>

                {/* Fecha — mini calendar */}
                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Fecha</Text>
                  <MiniCalendar
                    selectedIso={manualDraft.isoDate}
                    pickerMonth={manualPickerMonth}
                    onSelectDate={(iso) => setManualDraft((c) => ({ ...c, isoDate: iso }))}
                    onShiftMonth={(offset) => setManualPickerMonth(shiftMonth(manualPickerMonth, offset))}
                  />
                  {/* Selected date label */}
                  <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: "rgba(13,118,85,0.08)", paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#2E7B5E" }}>{formatFullDate(manualDraft.isoDate)}</Text>
                  </View>
                </View>

                {/* Tipo de comida */}
                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Comida</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {MEAL_TYPES.map((type) => {
                      const active = manualDraft.type === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          activeOpacity={0.82}
                          onPress={() => setManualDraft((c) => ({ ...c, type }))}
                          style={{ flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center", backgroundColor: active ? "#2E7B5E" : "white", borderWidth: active ? 0 : 1, borderColor: "rgba(0,0,0,0.08)" }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "white" : "#101111" }}>{type}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Plato */}
                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Plato</Text>
                  <TextInput
                    value={manualDraft.title}
                    onChangeText={(title) => setManualDraft((c) => ({ ...c, title }))}
                    placeholder="Ej. Arroz con pollo, Sopa de lentejas..."
                    placeholderTextColor="#B2B2B2"
                    autoFocus
                    style={{ borderRadius: 18, borderWidth: 1, borderColor: manualDraft.title ? "#0D7655" : "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 13, fontSize: 13, color: "#101111" }}
                  />
                </View>

                {/* Notas */}
                <View>
                  <Text style={{ marginBottom: 8, fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>
                    Notas <Text style={{ textTransform: "none", fontWeight: "400", color: "#A0A0A0" }}>(opcional)</Text>
                  </Text>
                  <TextInput
                    value={manualDraft.notes}
                    onChangeText={(notes) => setManualDraft((c) => ({ ...c, notes }))}
                    placeholder="Ej. Sin sal, con bastante cilantro..."
                    placeholderTextColor="#B2B2B2"
                    style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 13, fontSize: 13, color: "#101111" }}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSaveMeal}
                  disabled={saving || !manualDraft.title.trim()}
                  style={{ borderRadius: 999, paddingVertical: 16, alignItems: "center", backgroundColor: "#F97920", opacity: saving || !manualDraft.title.trim() ? 0.6 : 1, shadowColor: "#F97920", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
                >
                  {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Guardar comida</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add shopping item modal ── */}
      <Modal visible={showAddItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddItem(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Agregar al mercado</Text>
            <TouchableOpacity onPress={() => setShowAddItem(false)} style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, color: "#8D8D8D" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 40 }}>
              <TextInput
                value={itemDraft.title}
                onChangeText={(title) => setItemDraft((c) => ({ ...c, title }))}
                placeholder="Ej. Tomates, Leche, Arroz..."
                placeholderTextColor="#B2B2B2"
                autoFocus
                style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 13, fontSize: 13, color: "#101111" }}
              />
              <TextInput
                value={itemDraft.quantity}
                onChangeText={(quantity) => setItemDraft((c) => ({ ...c, quantity }))}
                placeholder="Cantidad (ej. 1kg, 2 und)"
                placeholderTextColor="#B2B2B2"
                style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 13, fontSize: 13, color: "#101111" }}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAddItem}
                disabled={saving || !itemDraft.title.trim()}
                style={{ borderRadius: 999, paddingVertical: 16, alignItems: "center", backgroundColor: "#F97920", opacity: saving || !itemDraft.title.trim() ? 0.6 : 1, shadowColor: "#F97920", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Agregar producto</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add recipe modal ── */}
      <Modal visible={showAddRecipe} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddRecipe(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#101111" }}>Nueva receta</Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: "#8D8D8D" }}>Guarda tu receta favorita</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAddRecipe(false)} style={{ borderRadius: 999, backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 48 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655", marginBottom: 7 }}>Nombre</Text>
                  <TextInput
                    value={recipeDraft.name}
                    onChangeText={(name) => setRecipeDraft((c) => ({ ...c, name }))}
                    placeholder="Ej. Sancocho de pollo"
                    placeholderTextColor="#C0C0C0"
                    autoFocus
                    style={{ borderRadius: 16, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: "#101111" }}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655", marginBottom: 7 }}>Tiempo</Text>
                  <TextInput
                    value={recipeDraft.prepTime}
                    onChangeText={(prepTime) => setRecipeDraft((c) => ({ ...c, prepTime }))}
                    placeholder="Ej. 45 min"
                    placeholderTextColor="#C0C0C0"
                    style={{ borderRadius: 16, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: "#101111" }}
                  />
                </View>
              </View>

              <View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: 7 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Ingredientes</Text>
                  <Text style={{ fontSize: 10, color: "#A3A3A3" }}>(uno por línea)</Text>
                </View>
                <TextInput
                  value={recipeDraft.ingredients}
                  onChangeText={(ingredients) => setRecipeDraft((c) => ({ ...c, ingredients }))}
                  placeholder={"500g pechuga de pollo\n2 papas medianas\nCilantro al gusto"}
                  placeholderTextColor="#C0C0C0"
                  multiline
                  textAlignVertical="top"
                  style={{ borderRadius: 16, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: "#101111", minHeight: 96 }}
                />
              </View>

              <View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: 7 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Preparación</Text>
                  <Text style={{ fontSize: 10, color: "#A3A3A3" }}>(un paso por línea)</Text>
                </View>
                <TextInput
                  value={recipeDraft.steps}
                  onChangeText={(steps) => setRecipeDraft((c) => ({ ...c, steps }))}
                  placeholder={"Cocinar el pollo 20 min\nAgregar las papas\nAjustar sal y servir"}
                  placeholderTextColor="#C0C0C0"
                  multiline
                  textAlignVertical="top"
                  style={{ borderRadius: 16, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: "#101111", minHeight: 96 }}
                />
              </View>

              <View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: 7 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#0D7655" }}>Notas</Text>
                  <Text style={{ fontSize: 10, color: "#A3A3A3" }}>(opcional)</Text>
                </View>
                <TextInput
                  value={recipeDraft.notes}
                  onChangeText={(notes) => setRecipeDraft((c) => ({ ...c, notes }))}
                  placeholder="Ej. Receta de la abuela, perfecta para días fríos"
                  placeholderTextColor="#C0C0C0"
                  style={{ borderRadius: 16, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: "#101111" }}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!recipeDraft.name.trim()}
                onPress={() => {
                  if (!recipeDraft.name.trim()) return;
                  setRecipes((c) => [{ id: `recipe-${Date.now()}`, title: recipeDraft.name.trim(), prepTime: recipeDraft.prepTime || undefined, source: "manual" }, ...c]);
                  setRecipeDraft({ name: "", prepTime: "", ingredients: "", steps: "", notes: "" });
                  setShowAddRecipe(false);
                }}
                style={{ borderRadius: 999, paddingVertical: 16, alignItems: "center", backgroundColor: "#F97920", opacity: !recipeDraft.name.trim() ? 0.6 : 1, shadowColor: "#F97920", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Guardar receta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

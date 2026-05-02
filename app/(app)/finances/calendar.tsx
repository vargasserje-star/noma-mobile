import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Svg, { Path, Rect, Line, Polygon, Circle, Polyline } from "react-native-svg";
import { SvgCssUri } from "react-native-svg/css";

import { AppHeader } from "@/components/shell/AppHeader";
import { useSession } from "@/lib/contexts/session-context";
import { useFinances, type NewRecurringPayload } from "@/lib/contexts/finances-context";
import { formatCurrency } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────

type PaymentType = "all" | "subscription" | "fixed" | "service";

type CalendarEntry = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  month: number;
  year: number;
  type: "subscription" | "fixed" | "service";
  recurringPaymentId?: string;
  paidStatus?: "paid" | "pending" | "skipped";
};

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_META: Record<CalendarEntry["type"], { bg: string; text: string; label: string; emoji: string }> = {
  subscription: { bg: "#ede9fe", text: "#7c3aed", label: "Suscripción", emoji: "📱" },
  fixed:        { bg: "#d1fae5", text: "#0D7655",  label: "Gasto fijo",  emoji: "🏠" },
  service:      { bg: "#fff7ed", text: "#FF6A00",  label: "Servicio",    emoji: "⚡" },
};

const TYPE_FILTERS: { key: PaymentType; label: string }[] = [
  { key: "all",          label: "Todos"         },
  { key: "subscription", label: "Suscripciones" },
  { key: "fixed",        label: "Gastos fijos"  },
  { key: "service",      label: "Servicios"     },
];

const WEEKDAYS  = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS_LONG = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const CALENDAR_ICONS = {
  administracion: require("@/assets/icons/calendar/administracion.svg"),
  wifi:           require("@/assets/icons/calendar/Wifi_Icon.svg"),
  adobe: require("@/assets/icons/calendar/adobe.svg"),
  agua: require("@/assets/icons/calendar/agua.svg"),
  amazonprime: require("@/assets/icons/calendar/amazon-prime.svg"),
  applemusic: require("@/assets/icons/calendar/apple-music.svg"),
  banco: require("@/assets/icons/calendar/banco.svg"),
  cabify: require("@/assets/icons/calendar/cabify.svg"),
  canva: require("@/assets/icons/calendar/canva.svg"),
  chatgpt: require("@/assets/icons/calendar/chatgpt.svg"),
  claude: require("@/assets/icons/calendar/claude.svg"),
  didi: require("@/assets/icons/calendar/didi.svg"),
  disneyplus: require("@/assets/icons/calendar/disney-plus.svg"),
  dropbox: require("@/assets/icons/calendar/dropbox.svg"),
  gas: require("@/assets/icons/calendar/gas.svg"),
  gemini: require("@/assets/icons/calendar/gemini.svg"),
  googleone: require("@/assets/icons/calendar/google-one.svg"),
  gym: require("@/assets/icons/calendar/gym.svg"),
  icloud: require("@/assets/icons/calendar/icloud.svg"),
  ifood: require("@/assets/icons/calendar/ifood.svg"),
  luz: require("@/assets/icons/calendar/luz.svg"),
  max: require("@/assets/icons/calendar/max.svg"),
  microsoft: require("@/assets/icons/calendar/microsoft.svg"),
  netflix: require("@/assets/icons/calendar/netflix.svg"),
  notion: require("@/assets/icons/calendar/notion.svg"),
  rappi: require("@/assets/icons/calendar/rappi.svg"),
  spotify: require("@/assets/icons/calendar/spotify.svg"),
  telefonia: require("@/assets/icons/calendar/telefonia.svg"),
  ubereats: require("@/assets/icons/calendar/uber-eats.svg"),
  uberone: require("@/assets/icons/calendar/uber-one.svg"),
  youtube: require("@/assets/icons/calendar/youtube.svg"),
} as const;

const CALENDAR_SERVICE_MATCHERS: Array<{ key: keyof typeof CALENDAR_ICONS; aliases: string[] }> = [
  { key: "netflix", aliases: ["netflix"] },
  { key: "spotify", aliases: ["spotify", "spotifyfamily", "spotifyduo", "spotifypremium"] },
  { key: "amazonprime", aliases: ["amazonprime", "primevideo", "primevideo", "amazonvideo", "primemusic", "amazonmusic"] },
  { key: "disneyplus", aliases: ["disneyplus", "disney"] },
  { key: "max", aliases: ["hbomax", "hbo", "maxstreaming"] },
  { key: "youtube", aliases: ["youtube", "youtubemusic", "youtubepremium"] },
  { key: "applemusic", aliases: ["applemusic", "appletv", "appletvplus"] },
  { key: "icloud", aliases: ["icloud", "icloudplus", "applestorage"] },
  { key: "adobe", aliases: ["adobe", "creativecloud", "lightroom", "photoshop", "illustrator", "premiere"] },
  { key: "canva", aliases: ["canva"] },
  { key: "chatgpt", aliases: ["chatgpt", "openai", "gptplus"] },
  { key: "claude", aliases: ["claude", "anthropic"] },
  { key: "dropbox", aliases: ["dropbox"] },
  { key: "gemini", aliases: ["gemini", "bard"] },
  { key: "googleone", aliases: ["googleone", "googleworkspace", "googlestorage", "googledrive"] },
  { key: "microsoft", aliases: ["microsoft", "office365", "office", "onedrive", "xbox"] },
  { key: "notion", aliases: ["notion"] },
  { key: "banco", aliases: ["banco", "bancolombia", "davivienda", "bbva", "scotiabank", "itau", "citibank", "nequi", "daviplata", "nubank", "hipoteca", "leasing", "prestamo", "tarjetacredito"] },
  { key: "agua", aliases: ["agua", "acueducto", "triplea", "aguasbogota"] },
  { key: "gas", aliases: ["gasnatural", "gasdomiciliario", "vanti", "surtigas", "alcanos"] },
  { key: "luz", aliases: ["luz", "electricidad", "energia", "electrica", "codensa", "celsia", "epm"] },
  { key: "administracion", aliases: ["administracion", "condominio", "copropiedad", "conjuntoresidencial"] },
  { key: "wifi", aliases: ["wifi", "internet", "fibra", "internethogar", "internetcasa", "etb", "une", "clarohogar", "movistarhogar", "tigohogar"] },
  { key: "telefonia", aliases: ["telefono", "celular", "movistar", "claro", "tigo", "wom", "movil", "telefonia", "datosmoviles", "planmovil", "plancelular"] },
  { key: "rappi", aliases: ["rappi", "rappiprime"] },
  { key: "ubereats", aliases: ["ubereats", "ubereat"] },
  { key: "ifood", aliases: ["ifood"] },
  { key: "didi", aliases: ["didi", "didifood"] },
  { key: "cabify", aliases: ["cabify"] },
  { key: "uberone", aliases: ["uberone", "uberpass"] },
  { key: "gym", aliases: ["gym", "gimnasio", "smartfit", "bodytech", "pilates", "yoga", "crossfit"] },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function norm(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function resolveCalendarAssetId(name: string) {
  const normalized = norm(name);
  const match = CALENDAR_SERVICE_MATCHERS.find(({ aliases }) =>
    aliases.some((alias) => {
      const normalizedAlias = norm(alias);
      return normalizedAlias.length >= 4
        ? normalized.includes(normalizedAlias)
        : normalized === normalizedAlias;
    })
  );
  return match ? CALENDAR_ICONS[match.key] : null;
}

function parseDaysUntil(str: string): number {
  if (/hoy/i.test(str))    return 0;
  if (/mañana/i.test(str)) return 1;
  const m = str.match(/(\d+)\s*día/);
  return m ? parseInt(m[1]) : 0;
}

function parseDayFromLabel(str: string): number {
  const m1 = str.match(/·\s*(\d+)/);    if (m1) return parseInt(m1[1]);
  const m2 = str.match(/^(\d+)/);        if (m2) return parseInt(m2[1]);
  const m3 = str.match(/\b(\d+)\s+de/); if (m3) return parseInt(m3[1]);
  return new Date().getDate();
}

function classifyType(name: string, def: CalendarEntry["type"]): CalendarEntry["type"] {
  const lower = name.toLowerCase();
  if (/administrac|condomin|banco|financiero|hipoteca|leasing|cuota/.test(lower)) return "service";
  return def;
}

function getServiceIcon(name: string, color: string, size = 14) {
  const lower = name.toLowerCase();
  const p = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  if (/netflix|spotify|disney|amazon|hulu|apple|youtube/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Rect x={2} y={7} width={20} height={15} rx={2} stroke={color} strokeWidth={1.8}/><Polyline points="17 2 12 7 7 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
  if (/agua/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></Svg>;
  if (/\bgas\b/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></Svg>;
  if (/luz|electr|energía|energia/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
  if (/internet|wifi|fibra/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><Circle cx={12} cy={20} r={1} fill={color}/></Svg>;
  if (/banco|financiero|hipoteca/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Rect x={3} y={10} width={18} height={11} rx={1} stroke={color} strokeWidth={1.8}/><Path d="M12 3L3 10h18L12 3z"/></Svg>;
  if (/nómina|nomina|emplead/.test(lower))
    return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8}/></Svg>;
  // default: credit card
  return <Svg width={size} height={size} viewBox="0 0 24 24" {...p}><Rect x={1} y={4} width={22} height={16} rx={2} stroke={color} strokeWidth={1.8}/><Line x1={1} y1={10} x2={23} y2={10} stroke={color} strokeWidth={1.8}/></Svg>;
}

// ── Small icon circle for calendar cell ────────────────────────────────────

function CalendarDot({ entry, status }: { entry: CalendarEntry; status: "today" | "soon" | "past" | "future" }) {
  const meta = TYPE_META[entry.type];
  const abbr = entry.name.slice(0, 2).toUpperCase();
  const assetId = resolveCalendarAssetId(entry.name);
  const svgUri = assetId ? Image.resolveAssetSource(assetId)?.uri : null;
  const dim = status === "past" ? 0.35 : 1;
  const ring =
    status === "today" ? { borderWidth: 2, borderColor: "#0D7655" } :
    status === "soon"  ? { borderWidth: 2, borderColor: "#FF6A00" } : {};

  return (
    <View style={{ position: "relative" }}>
      <View
        style={[
          { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: svgUri ? "#FFFFFF" : meta.bg, opacity: dim, overflow: "hidden" },
          ring,
        ]}
      >
        {svgUri ? (
          <View style={{ width: 20, height: 20 }}>
            <SvgCssUri uri={svgUri} width="100%" height="100%" />
          </View>
        ) : (
          <Text style={{ fontSize: 8, fontWeight: "800", color: meta.text }}>{abbr}</Text>
        )}
      </View>
      {entry.paidStatus === "paid" && (
        <View style={{ position: "absolute", bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: "#0D7655", borderWidth: 1.5, borderColor: "white", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "white", fontSize: 6, fontWeight: "900" }}>✓</Text>
        </View>
      )}
    </View>
  );
}

// ── Service icon box (for list items) ──────────────────────────────────────

function ServiceBox({ entry, size = 44 }: { entry: CalendarEntry; size?: number }) {
  const meta = TYPE_META[entry.type];
  const assetId = resolveCalendarAssetId(entry.name);
  const svgUri = assetId ? Image.resolveAssetSource(assetId)?.uri : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: svgUri ? "#FFFFFF" : meta.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {svgUri ? (
        <View style={{ width: size * 0.72, height: size * 0.72 }}>
          <SvgCssUri uri={svgUri} width="100%" height="100%" />
        </View>
      ) : (
        getServiceIcon(entry.name, meta.text, size * 0.4)
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function PaymentCalendarScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { subscriptions, fixedExpenses, recurringPayments, monthRecords, markAsPaid, skipPayment, getMonthRecord, addRecurring } = useFinances();

  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [filter,    setFilter]    = useState<PaymentType>("all");

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<{ name: string; amount: string; kind: NewRecurringPayload["kind"] }>({
    name: "", amount: "", kind: "subscription",
  });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function openDay(day: number) {
    setSelectedDay(day);
    setShowAddForm(false);
    setAddDraft({ name: "", amount: "", kind: "subscription" });
    setAddError("");
  }

  function closeSheet() {
    setSelectedDay(null);
    setShowAddForm(false);
    setAddDraft({ name: "", amount: "", kind: "subscription" });
    setAddError("");
  }

  function submitAdd() {
    const name = addDraft.name.trim();
    const amount = Number(addDraft.amount);
    if (!name) { setAddError("Escribe el nombre del servicio."); return; }
    if (!amount || amount <= 0) { setAddError("Ingresa un monto válido."); return; }
    setAddSaving(true);
    addRecurring({ kind: addDraft.kind, name, amount, dayOfMonth: selectedDay! });
    setShowAddForm(false);
    setAddDraft({ name: "", amount: "", kind: "subscription" });
    setAddError("");
    setAddSaving(false);
  }

  // ── Build entries ──────────────────────────────────────────────────────

  const entries: CalendarEntry[] = useMemo(() => {
    const seen = new Set<string>();
    const list: CalendarEntry[] = [];

    for (const sub of subscriptions) {
      const daysUntil = parseDaysUntil(sub.renewsIn);
      const d = new Date(today);
      d.setDate(today.getDate() + daysUntil);
      seen.add(sub.name.toLowerCase());
      list.push({
        id: `s-${sub.id}`,
        name: sub.name,
        amount: sub.amount,
        dayOfMonth: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        type: classifyType(sub.name, "subscription"),
      });
    }

    for (const fe of fixedExpenses) {
      if (seen.has(fe.name.toLowerCase())) continue;
      const day = parseDayFromLabel(fe.nextCharge);
      const targetDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (targetDate < today) targetDate.setMonth(targetDate.getMonth() + 1);
      list.push({
        id: `f-${fe.id}`,
        name: fe.name,
        amount: fe.amount,
        dayOfMonth: targetDate.getDate(),
        month: targetDate.getMonth(),
        year: targetDate.getFullYear(),
        type: classifyType(fe.name, "fixed"),
      });
    }

    for (const rp of recurringPayments) {
      if (!rp.active) continue;
      const record = getMonthRecord(rp.id, viewMonth, viewYear);
      list.push({
        id: `rp-${rp.id}`,
        name: rp.name,
        amount: rp.amount,
        dayOfMonth: rp.dayOfMonth,
        month: viewMonth,
        year: viewYear,
        type: rp.kind === "subscription" ? "subscription" : rp.kind === "fixed" ? "fixed" : "service",
        recurringPaymentId: rp.id,
        paidStatus: record?.status ?? "pending",
      });
    }

    return list;
  }, [subscriptions, fixedExpenses, recurringPayments, monthRecords, viewMonth, viewYear]);

  const filtered = useMemo(
    () => filter === "all" ? entries : entries.filter((e) => e.type === filter),
    [entries, filter]
  );

  // Calendar grid
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (() => { const d = new Date(viewYear, viewMonth, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const totalCells     = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstDayOfWeek - daysInMonth).fill(null),
  ];

  const dayMap = useMemo(() => {
    const map: Record<number, CalendarEntry[]> = {};
    for (const e of filtered) {
      if (e.month === viewMonth && e.year === viewYear) {
        (map[e.dayOfMonth] ??= []).push(e);
      }
    }
    return map;
  }, [filtered, viewMonth, viewYear]);

  const allDayMap = useMemo(() => {
    const map: Record<number, CalendarEntry[]> = {};
    for (const e of entries) {
      if (e.month === viewMonth && e.year === viewYear) {
        (map[e.dayOfMonth] ??= []).push(e);
      }
    }
    return map;
  }, [entries, viewMonth, viewYear]);

  const monthPayments = useMemo(
    () => filtered
      .filter((e) => e.month === viewMonth && e.year === viewYear)
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [filtered, viewMonth, viewYear]
  );

  const totalMonth     = monthPayments.reduce((s, e) => s + e.amount, 0);
  const todayDay       = today.getDate();
  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const viewerInitials = (session?.name ?? "").split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  const upcomingCount = monthPayments.filter((entry) => !isCurrentMonth || entry.dayOfMonth >= todayDay).length;

  function daysUntilPayment(day: number): string {
    if (!isCurrentMonth) return "";
    const diff = day - todayDay;
    if (diff < 0)  return "Cobrado";
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    return `${diff} días`;
  }

  function dayStatus(day: number): "today" | "soon" | "past" | "future" {
    if (!isCurrentMonth) return "future";
    const diff = day - todayDay;
    if (diff === 0) return "today";
    if (diff < 0)  return "past";
    if (diff <= 5) return "soon";
    return "future";
  }

  const selectedDayEntries = selectedDay ? (allDayMap[selectedDay] ?? []) : [];
  const selectedDate = selectedDay ? new Date(viewYear, viewMonth, selectedDay) : null;
  const nextPayment = monthPayments.find((e) => e.dayOfMonth >= todayDay);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0ea" }}>
      <AppHeader viewerInitials={viewerInitials} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#2F7E5A", fontSize: 26, marginTop: -2 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#101111" }}>Nunca olvides un pago</Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: "#A7A39D" }}>
              {monthPayments.length} pago{monthPayments.length !== 1 ? "s" : ""} este mes · {formatCurrency(totalMonth)}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 10, paddingVertical: 2 }}>
            {TYPE_FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilter(key)}
                  style={{
                    borderRadius: 22,
                    paddingHorizontal: 18,
                    paddingVertical: 11,
                    backgroundColor: active ? "#0D7655" : "white",
                    shadowColor: "#000",
                    shadowOpacity: active ? 0 : 0.04,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: active ? 0 : 1,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "white" : "#7F7C78" }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Calendar card ────────────────────────────────── */}
        <View style={{ backgroundColor: "white", borderRadius: 28, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          {/* Month nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
            <TouchableOpacity
              onPress={prevMonth}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5F0EA", alignItems: "center", justifyContent: "center" }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#2F7E5A", fontSize: 18, marginRight: 2 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#101111" }}>{MONTHS_ES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity
              onPress={nextMonth}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5F0EA", alignItems: "center", justifyContent: "center" }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#2F7E5A", fontSize: 18, marginLeft: 2 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={{ flexDirection: "row", paddingHorizontal: 10 }}>
            {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
              <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#A7A39D", letterSpacing: 0.9 }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingBottom: 18 }}>
            {cells.map((day, idx) => {
              if (!day) {
                return <View key={`e-${idx}`} style={{ width: "14.285%", height: 62 }} />;
              }
              const dayEntries = dayMap[day] ?? [];
              const status  = dayStatus(day);
              const isToday = status === "today";
              const hasPay  = dayEntries.length > 0;

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => openDay(day)}
                  style={{ width: "14.285%", height: 68, alignItems: "center", paddingTop: 4, gap: 4 }}
                  activeOpacity={0.7}
                >
                  {isToday ? (
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#2F7E5A", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "white" }}>{day}</Text>
                    </View>
                  ) : (
                    <Text style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: status === "past" ? "#D4D0CB" : "#101111",
                      lineHeight: 22,
                    }}>{day}</Text>
                  )}
                  {hasPay ? (
                    <View style={{ position: "relative" }}>
                      <CalendarDot entry={dayEntries[0]} status={status} />
                      {dayEntries.length > 1 && (
                        <View style={{
                          position: "absolute", top: -3, right: -4,
                          width: 16, height: 16, borderRadius: 8,
                          backgroundColor: "#FF6A00",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{ color: "white", fontSize: 8, fontWeight: "900" }}>+{dayEntries.length - 1}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={{ height: 26 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingVertical: 14 }}>
            {[
              { color: "#2F7E5A", label: "Hoy", count: String(upcomingCount) },
              { color: "#FF6A00", label: "Próximo" },
              { color: "#E7E4E0", label: "Cobrado" },
            ].map(({ color, label, count }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {count ? (
                  <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: color, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>{count}</Text>
                  </View>
                ) : (
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: label === "Próximo" ? 2 : 0, borderColor: label === "Próximo" ? "#fff3eb" : "transparent" }} />
                )}
                <Text style={{ fontSize: 11, color: "#737373" }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Payment list ─────────────────────────────────── */}
        <View style={{ backgroundColor: "white", borderRadius: 28, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, color: "#0D7655" }}>
              {MONTHS_ES[viewMonth]} {viewYear}
            </Text>
            <View style={{ backgroundColor: "rgba(13,118,85,0.1)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#0D7655" }}>{formatCurrency(totalMonth)}</Text>
            </View>
          </View>

          {monthPayments.length === 0 ? (
            <View style={{ alignItems: "center", paddingBottom: 32, paddingTop: 16 }}>
              <Text style={{ fontSize: 28 }}>📅</Text>
              <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "500", color: "#a3a3a3" }}>Sin pagos este mes</Text>
            </View>
          ) : (
            <View>
              {monthPayments.map((entry, idx) => {
                const meta   = TYPE_META[entry.type];
                const statusTx = daysUntilPayment(entry.dayOfMonth);
                const isPast   = isCurrentMonth && entry.dayOfMonth < todayDay;
                const isToday_ = isCurrentMonth && entry.dayOfMonth === todayDay;
                const soonDiff = isCurrentMonth ? entry.dayOfMonth - todayDay : 999;
                const isLast   = idx === monthPayments.length - 1;

                return (
                  <TouchableOpacity
                    key={entry.id}
                    onPress={() => openDay(entry.dayOfMonth)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: "rgba(0,0,0,0.04)",
                    }}
                    activeOpacity={0.7}
                  >
                    <ServiceBox entry={entry} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 10, fontWeight: "600", color: isPast ? "#a3a3a3" : "#101111" }} numberOfLines={1}>{entry.name}</Text>
                      <Text style={{ fontSize: 11, color: "#a3a3a3", marginTop: 2 }}>{meta.label} · día {entry.dayOfMonth}</Text>
                    </View>
                    {isCurrentMonth && (
                      <View style={{
                        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                        backgroundColor:
                          isPast   ? "rgba(0,0,0,0.06)" :
                          isToday_ ? "rgba(255,106,0,0.12)" :
                          soonDiff <= 5 ? "rgba(255,106,0,0.08)" :
                          "rgba(13,118,85,0.08)",
                      }}>
                        <Text style={{
                          fontSize: 10, fontWeight: "600",
                          color:
                            isPast   ? "#a3a3a3" :
                            isToday_ ? "#FF6A00" :
                            soonDiff <= 5 ? "#FF6A00" :
                            "#0D7655",
                        }}>
                          {isPast ? "Cobrado" : statusTx}
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isPast ? "#a3a3a3" : "#101111", flexShrink: 0 }}>
                      {formatCurrency(entry.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Summary dark card ────────────────────────────── */}
        {monthPayments.length > 0 && (
          <View style={{
            borderRadius: 28, padding: 20,
            backgroundColor: "#0d3d2b",
            shadowColor: "#0D7655", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>⭐</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(255,255,255,0.45)" }}>Resumen del mes</Text>
                <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "800", color: "white" }}>{formatCurrency(totalMonth)}</Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                  en {monthPayments.length} pago{monthPayments.length !== 1 ? "s" : ""} · {MONTHS_ES[viewMonth]}
                </Text>
              </View>
            </View>

            {isCurrentMonth && nextPayment && (
              <View style={{ marginTop: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", padding: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.35)" }}>Próximo pago</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 8, fontWeight: "800", color: "white" }}>{nextPayment.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>{nextPayment.name}</Text>
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
                      {formatCurrency(nextPayment.amount)} · {daysUntilPayment(nextPayment.dayOfMonth)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Day detail modal ─────────────────────────────────── */}
      <Modal
        visible={selectedDay !== null}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
            onPress={closeSheet}
          />
          <View style={{
            backgroundColor: "#f5f0ea",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: 24,
            maxHeight: "82%",
            shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20,
          }}>
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)" }} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {/* Sheet header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: "#0D7655" }}>
                    {selectedDate ? WEEKDAYS_LONG[selectedDate.getDay()] : ""}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111", marginTop: 2 }}>
                    {selectedDay} de {MONTHS_ES[viewMonth]}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeSheet}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 10, color: "#666", fontWeight: "500" }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Entries for this day */}
              {selectedDayEntries.length > 0 ? (
                <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: "white", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
                  {selectedDayEntries.map((entry, idx) => {
                const isPast   = isCurrentMonth && entry.dayOfMonth < todayDay;
                const isToday_ = isCurrentMonth && entry.dayOfMonth === todayDay;
                const soonDiff = isCurrentMonth ? entry.dayOfMonth - todayDay : 999;
                const isRecurring = !!entry.recurringPaymentId;
                const rpPaid    = entry.paidStatus === "paid";
                const rpSkipped = entry.paidStatus === "skipped";
                const isLast    = idx === selectedDayEntries.length - 1;
                const meta = TYPE_META[entry.type];

                return (
                  <View key={entry.id} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "rgba(0,0,0,0.04)" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                      <ServiceBox entry={entry} size={36} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: "#101111" }} numberOfLines={1}>{entry.name}</Text>
                        <Text style={{ fontSize: 11, color: "#a3a3a3", marginTop: 1 }}>
                          {meta.label}{isRecurring ? " · programado" : ""}
                        </Text>
                      </View>
                      {isRecurring ? (
                        <View style={{
                          borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                          backgroundColor: rpPaid ? "rgba(13,118,85,0.1)" : rpSkipped ? "rgba(0,0,0,0.06)" : "rgba(255,106,0,0.1)",
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "600", color: rpPaid ? "#0D7655" : rpSkipped ? "#737373" : "#FF6A00" }}>
                            {rpPaid ? "Pagado ✓" : rpSkipped ? "Saltado" : "Pendiente"}
                          </Text>
                        </View>
                      ) : isCurrentMonth ? (
                        <View style={{
                          borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                          backgroundColor: isPast ? "rgba(0,0,0,0.06)" : isToday_ ? "rgba(255,106,0,0.12)" : soonDiff <= 5 ? "rgba(255,106,0,0.08)" : "rgba(13,118,85,0.08)",
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "600", color: isPast ? "#a3a3a3" : isToday_ || soonDiff <= 5 ? "#FF6A00" : "#0D7655" }}>
                            {isPast ? "Cobrado" : isToday_ ? "Hoy" : soonDiff === 1 ? "Mañana" : `${soonDiff}d`}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111", flexShrink: 0 }}>{formatCurrency(entry.amount)}</Text>
                    </View>

                    {isRecurring && !rpPaid && !rpSkipped && (
                      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
                        <TouchableOpacity
                          onPress={() => { markAsPaid(entry.recurringPaymentId!, viewMonth, viewYear); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                          style={{ flex: 1, borderRadius: 20, backgroundColor: "#0D7655", paddingVertical: 10, alignItems: "center" }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "white" }}>Marcar como pagado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => skipPayment(entry.recurringPaymentId!, viewMonth, viewYear)}
                          style={{ borderRadius: 20, backgroundColor: "rgba(0,0,0,0.06)", paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 12, color: "#737373" }}>Saltar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
                  })}
                </View>
              ) : (
                <View style={{ marginHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f5f0ea", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14 }}>📅</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: "#a3a3a3" }}>Sin pagos en este día</Text>
                </View>
              )}

              {/* Add form / button */}
              {showAddForm ? (
                <View style={{ marginHorizontal: 16, marginBottom: 4, backgroundColor: "white", borderRadius: 20, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: "#0D7655", marginBottom: 12 }}>
                    Nuevo pago — día {selectedDay}
                  </Text>

                  <TextInput
                    value={addDraft.name}
                    onChangeText={(v) => { setAddDraft((c) => ({ ...c, name: v })); setAddError(""); }}
                    placeholder="Nombre (ej. Netflix, Agua)"
                    placeholderTextColor="#ccc"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: 14, backgroundColor: "#f5f0ea", paddingHorizontal: 12, paddingVertical: 10, fontSize: 10, color: "#101111", marginBottom: 10 }}
                  />

                  <TextInput
                    value={addDraft.amount}
                    onChangeText={(v) => { setAddDraft((c) => ({ ...c, amount: v })); setAddError(""); }}
                    placeholder="Monto mensual"
                    placeholderTextColor="#ccc"
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: 14, backgroundColor: "#f5f0ea", paddingHorizontal: 12, paddingVertical: 10, fontSize: 10, color: "#101111", marginBottom: 10 }}
                  />

                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                    {(["subscription", "fixed", "service"] as const).map((k) => {
                      const labels = { subscription: "Suscripción", fixed: "Gasto fijo", service: "Servicio" };
                      const active = addDraft.kind === k;
                      return (
                        <TouchableOpacity
                          key={k}
                          onPress={() => setAddDraft((c) => ({ ...c, kind: k }))}
                          style={{ flex: 1, borderRadius: 20, paddingVertical: 8, alignItems: "center", backgroundColor: active ? "#0D7655" : "#f5f0ea" }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "600", color: active ? "white" : "#737373" }}>{labels[k]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {addError ? <Text style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{addError}</Text> : null}

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => { setShowAddForm(false); setAddError(""); }}
                      style={{ borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: "#f5f0ea" }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#737373" }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submitAdd}
                      disabled={addSaving}
                      style={{ flex: 1, borderRadius: 20, paddingVertical: 10, alignItems: "center", backgroundColor: "#FF6A00", opacity: addSaving ? 0.6 : 1 }}
                      activeOpacity={0.8}
                    >
                      {addSaving ? <ActivityIndicator color="white" size="small" /> : (
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>Guardar pago</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowAddForm(true)}
                  style={{ marginHorizontal: 16, borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(13,118,85,0.3)", paddingVertical: 16, alignItems: "center", backgroundColor: "rgba(13,118,85,0.04)" }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#0D7655" }}>+ Añadir pago en este día</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

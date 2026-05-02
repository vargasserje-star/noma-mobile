import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Polyline,
  Rect,
  Stop,
} from "react-native-svg";

import { SvgCssUri } from "react-native-svg/css";

import { AppHeader } from "@/components/shell/AppHeader";
import { useSession } from "@/lib/contexts/session-context";
import { useFinances } from "@/lib/contexts/finances-context";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api/client";
import type { AllowanceSummary, CategorySpend, DashboardData, ExpenseSummary, MemberSummary, SavingsGoal } from "@/lib/types";

const HERO_FINANCE = require("@/assets/images/finance-wallet-growth-bills.webp");
const MESADAS_ICON = require("@/assets/icons/Mesadas_1.svg");

// ─── Service brand icons ───────────────────────────────────────────────────────
const SERVICE_ICONS = {
  administracion: require("@/assets/icons/calendar/administracion.svg"),
  adobe:          require("@/assets/icons/calendar/adobe.svg"),
  agua:           require("@/assets/icons/calendar/agua.svg"),
  amazonprime:    require("@/assets/icons/calendar/amazon-prime.svg"),
  applemusic:     require("@/assets/icons/calendar/apple-music.svg"),
  banco:          require("@/assets/icons/calendar/banco.svg"),
  cabify:         require("@/assets/icons/calendar/cabify.svg"),
  canva:          require("@/assets/icons/calendar/canva.svg"),
  chatgpt:        require("@/assets/icons/calendar/chatgpt.svg"),
  claude:         require("@/assets/icons/calendar/claude.svg"),
  didi:           require("@/assets/icons/calendar/didi.svg"),
  disneyplus:     require("@/assets/icons/calendar/disney-plus.svg"),
  dropbox:        require("@/assets/icons/calendar/dropbox.svg"),
  gas:            require("@/assets/icons/calendar/gas.svg"),
  gemini:         require("@/assets/icons/calendar/gemini.svg"),
  googleone:      require("@/assets/icons/calendar/google-one.svg"),
  gym:            require("@/assets/icons/calendar/gym.svg"),
  icloud:         require("@/assets/icons/calendar/icloud.svg"),
  ifood:          require("@/assets/icons/calendar/ifood.svg"),
  luz:            require("@/assets/icons/calendar/luz.svg"),
  max:            require("@/assets/icons/calendar/max.svg"),
  microsoft:      require("@/assets/icons/calendar/microsoft.svg"),
  netflix:        require("@/assets/icons/calendar/netflix.svg"),
  notion:         require("@/assets/icons/calendar/notion.svg"),
  rappi:          require("@/assets/icons/calendar/rappi.svg"),
  spotify:        require("@/assets/icons/calendar/spotify.svg"),
  telefonia:      require("@/assets/icons/calendar/telefonia.svg"),
  ubereats:       require("@/assets/icons/calendar/uber-eats.svg"),
  uberone:        require("@/assets/icons/calendar/uber-one.svg"),
  wifi:           require("@/assets/icons/calendar/Wifi_Icon.svg"),
  youtube:        require("@/assets/icons/calendar/youtube.svg"),
} as const;

const SERVICE_MATCHERS: Array<{ key: keyof typeof SERVICE_ICONS; aliases: string[] }> = [
  { key: "netflix",       aliases: ["netflix"] },
  { key: "spotify",       aliases: ["spotify", "spotifyfamily", "spotifyduo", "spotifypremium"] },
  { key: "amazonprime",   aliases: ["amazonprime", "primevideo", "amazonvideo", "primemusic", "amazonmusic", "amazon prime", "prime video"] },
  { key: "disneyplus",    aliases: ["disneyplus", "disney"] },
  { key: "max",           aliases: ["hbomax", "hbo", "maxstreaming"] },
  { key: "youtube",       aliases: ["youtube", "youtubemusic", "youtubepremium"] },
  { key: "applemusic",    aliases: ["applemusic", "appletv", "appletvplus"] },
  { key: "icloud",        aliases: ["icloud", "icloudplus", "applestorage"] },
  { key: "adobe",         aliases: ["adobe", "creativecloud", "lightroom", "photoshop", "illustrator", "premiere"] },
  { key: "canva",         aliases: ["canva"] },
  { key: "chatgpt",       aliases: ["chatgpt", "openai", "gptplus"] },
  { key: "claude",        aliases: ["claude", "anthropic"] },
  { key: "dropbox",       aliases: ["dropbox"] },
  { key: "gemini",        aliases: ["gemini", "bard"] },
  { key: "googleone",     aliases: ["googleone", "googleworkspace", "googlestorage", "googledrive", "google one"] },
  { key: "microsoft",     aliases: ["microsoft", "office365", "office", "onedrive", "xbox"] },
  { key: "notion",        aliases: ["notion"] },
  { key: "banco",         aliases: ["banco", "bancolombia", "davivienda", "bbva", "scotiabank", "itau", "citibank", "nequi", "daviplata", "nubank", "hipoteca", "leasing", "prestamo", "tarjetacredito"] },
  { key: "agua",          aliases: ["agua", "acueducto", "triplea", "aguasbogota"] },
  { key: "gas",           aliases: ["gasnatural", "gasdomiciliario", "vanti", "surtigas", "alcanos"] },
  { key: "luz",           aliases: ["luz", "electricidad", "energia", "electrica", "codensa", "celsia", "epm"] },
  { key: "administracion",aliases: ["administracion", "condominio", "copropiedad", "conjuntoresidencial", "admin"] },
  { key: "wifi",          aliases: ["wifi", "internet", "fibra", "internethogar", "internetcasa", "hogarinternet", "banda ancha", "banda", "etb", "une", "claro hogar", "movistar hogar", "tigo hogar", "hogar digital"] },
  { key: "telefonia",     aliases: ["telefono", "celular", "movistar", "claro", "tigo", "wom", "movil", "telefonia", "datosmoviles", "plan celular", "plan movil"] },
  { key: "rappi",         aliases: ["rappi", "rappiprime"] },
  { key: "ubereats",      aliases: ["ubereats", "ubereat"] },
  { key: "ifood",         aliases: ["ifood"] },
  { key: "didi",          aliases: ["didi", "didifood"] },
  { key: "cabify",        aliases: ["cabify"] },
  { key: "uberone",       aliases: ["uberone", "uberpass", "uber one"] },
  { key: "gym",           aliases: ["gym", "gimnasio", "smartfit", "bodytech", "pilates", "yoga", "crossfit"] },
];

function normServiceName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

function resolveServiceAsset(name: string) {
  const n = normServiceName(name);
  const match = SERVICE_MATCHERS.find(({ aliases }) =>
    aliases.some((alias) => {
      const na = normServiceName(alias);
      return na.length >= 4 ? n.includes(na) : n === na;
    })
  );
  return match ? SERVICE_ICONS[match.key] : null;
}

function RecurringServiceIcon({ name, size = 40, statusBadge }: { name: string; size?: number; statusBadge?: React.ReactNode }) {
  const asset = resolveServiceAsset(name);
  const svgUri = asset ? Image.resolveAssetSource(asset)?.uri : null;
  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: svgUri ? "#FFFFFF" : "rgba(92,147,216,0.14)",
        borderWidth: svgUri ? 1 : 0,
        borderColor: "#E8E3DC",
        alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {svgUri ? (
          <View style={{ width: size * 0.7, height: size * 0.7 }}>
            <SvgCssUri uri={svgUri} width="100%" height="100%" />
          </View>
        ) : (
          <Text style={{ fontSize: size * 0.35, fontWeight: "800", color: "#5C93D8" }}>
            {name.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      {statusBadge}
    </View>
  );
}

type QuickSection =
  | "gastos"
  | "distribucion"
  | "alertas"
  | "cobros"
  | "programados"
  | "metas"
  | "mesadas"
  | null;

type ProgramadoDraft = {
  name: string;
  amount: string;
  kind: "subscription" | "fixed" | "service";
  dayOfMonth: string;
  category: string;
  notifyDaysBefore: string;
};

type ExpenseDraft = {
  title: string;
  amount: string;
  category: string;
  spentAt: string;
};

type GoalDraft = {
  name: string;
  target: string;
  deadline: string;
};

type AllowanceDraft = {
  childName: string;
  weeklyAmount: string;
};

type ContributeDraft = {
  goalId: string;
  goalName: string;
  amount: string;
};

type RecurringPreview = {
  id: string;
  name: string;
  amount: number;
  subtitle: string;
  status?: "warning" | "ok";
  kind: "bill" | "fixed" | "subscription";
};

const kindLabels: Record<ProgramadoDraft["kind"], string> = {
  subscription: "Suscripción",
  fixed: "Gasto fijo",
  service: "Servicio",
};

const categoryOptions = [
  "Hogar",
  "Servicios",
  "Alimentación",
  "Transporte",
  "Entretenimiento",
  "Salud",
  "Educación",
  "Otros",
];

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { month: "long", year: "numeric" }).replace(/^(\w)/, (c) => c.toUpperCase());
}

// ─── SVG components ────────────────────────────────────────────────────────────

function GradientProgressBar({ progress }: { progress: number }) {
  const width = Math.min(Math.max(progress, 3), 100);
  return (
    <View style={{ height: 19, justifyContent: "center" }}>
      <Svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none">
        <Rect x="0" y="0" width="100" height="10" rx="5" fill="rgba(255,255,255,0.12)" />
        <Defs>
          <LinearGradient id="finHeroBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF7A1F" />
            <Stop offset="100%" stopColor="#50906D" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height="10" rx="5" fill="url(#finHeroBar)" />
      </Svg>
    </View>
  );
}

function MoneyIcon({ color = "#2F7E5A" }: { color?: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DistributionIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="10" width="4" height="10" rx="1.3" fill="#FF7A1F" />
      <Rect x="10" y="7" width="4" height="13" rx="1.3" fill="#2F7E5A" />
      <Rect x="17" y="4" width="4" height="16" rx="1.3" fill="#5C93D8" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#F47A21" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#F47A21" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FlowIcon({ color = "#2F7E5A" }: { color?: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Polyline points="17 1 21 5 17 9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="7 23 3 19 7 15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SparkIcon({ color = "#2F7E5A" }: { color?: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ color = "white" }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2.2" stroke={color} strokeWidth={1.8} />
      <Line x1="8" y1="2.5" x2="8" y2="6.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="16" y1="2.5" x2="16" y2="6.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={1.8} />
      <Circle cx="8.2" cy="15.2" r="1.1" fill={color} />
      <Circle cx="12.1" cy="15.2" r="1.1" fill={color} />
      <Circle cx="16" cy="15.2" r="1.1" fill={color} />
    </Svg>
  );
}

function GoalIcon({ color = "#2F7E5A" }: { color?: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="5.8" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="1.9" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function MesadasIcon() {
  const uri = Image.resolveAssetSource(MESADAS_ICON)?.uri;
  if (!uri) return null;
  return (
    <View style={{ width: 30, height: 30 }}>
      <SvgCssUri uri={uri} width="100%" height="100%" />
    </View>
  );
}

function WalletMiniIcon({ color = "rgba(255,255,255,0.65)" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2.5" stroke={color} strokeWidth={1.7} />
      <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

function TrendMiniIcon({ color = "rgba(255,255,255,0.65)" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="17 6 23 6 23 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UsedMiniIcon({ color = "rgba(255,255,255,0.65)" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21.2 15.9A10 10 0 1 1 8 2.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M22 12A10 10 0 0 0 12 2v10z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ color = "#B5B0AA" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDown({ color = "#C7C4BF" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Card components ───────────────────────────────────────────────────────────

function FinanceQuickCard({
  icon, title, badge, badgeTone = "muted", onPress, active,
}: {
  icon: ReactNode; title: string; badge: string;
  badgeTone?: "muted" | "green" | "orange"; onPress: () => void; active: boolean;
}) {
  const badgeColor = badgeTone === "orange" ? "#F47A21" : badgeTone === "green" ? "#2F7E5A" : "#7F7C78";
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1, minHeight: 126, borderRadius: 24, backgroundColor: "white", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3, borderWidth: active ? 1.5 : 0, borderColor: active ? "rgba(13,118,85,0.16)" : "transparent" }}>
      {icon}
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#101111" }}>{title}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: badgeColor }}>{badge}</Text>
      </View>
      <View style={{ position: "absolute", right: 14, bottom: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: "#F4EFE9", alignItems: "center", justifyContent: "center" }}>
        <ChevronRight color={active ? "#F47A21" : "#A9A39D"} />
      </View>
    </TouchableOpacity>
  );
}

function FinanceAccordionRow({
  icon, title, subtitle, badge, dark = false, open, onPress, chevronOnly = false,
}: {
  icon: ReactNode; title: string; subtitle: string; badge?: string;
  dark?: boolean; open?: boolean; onPress: () => void; chevronOnly?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ borderRadius: 22, backgroundColor: dark ? "#173F2E" : "white", paddingHorizontal: 16, paddingVertical: 14, shadowColor: "#000", shadowOpacity: dark ? 0.16 : 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dark ? "rgba(255,255,255,0.12)" : "#E8F2EC", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {dark ? (
          <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, color: "rgba(234,240,235,0.46)", textTransform: "uppercase" }}>
            Calendario de pagos
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Text style={{ fontSize: dark ? 15 : 14, fontWeight: "800", color: dark ? "white" : "#101111" }}>{title}</Text>
          {badge ? (
            <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "#E6F1EB" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#2F7E5A" }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ marginTop: 3, fontSize: 11, color: dark ? "rgba(234,240,235,0.56)" : "#7F7C78" }}>{subtitle}</Text>
      </View>
      {chevronOnly ? <ChevronRight color={dark ? "rgba(255,255,255,0.62)" : "#C7C4BF"} /> : <ChevronDown color={open ? "#0D7655" : "#C7C4BF"} />}
    </TouchableOpacity>
  );
}

function ExpandedSection({ title, children, onAdd, addLabel }: {
  title: string; children: ReactNode; onAdd?: () => void; addLabel?: string;
}) {
  return (
    <View style={{ borderRadius: 22, backgroundColor: "white", padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase", color: "#2F7E5A" }}>{title}</Text>
        {onAdd ? (
          <TouchableOpacity onPress={onAdd} activeOpacity={0.8} style={{ borderRadius: 999, backgroundColor: "#E6F1EB", paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D7655" }}>{addLabel ?? "+ Nuevo"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function CategoryRow({ item }: { item: CategorySpend }) {
  const tone = item.color === "terra" ? "#F47A21" : item.color === "gold" ? "#D39B1F" : item.color === "sky" ? "#5C93D8" : "#2F7E5A";
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 13 }}>{item.icon}</Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: "#101111", flexShrink: 1 }}>{item.name}</Text>
        </View>
        <Text style={{ fontSize: 12, color: "#7F7C78" }}>{item.share}%</Text>
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatCurrency(item.amount)}</Text>
      </View>
      <View style={{ marginTop: 8, height: 8, borderRadius: 999, backgroundColor: "#F0EBE5", overflow: "hidden" }}>
        <View style={{ width: `${Math.max(item.share, 4)}%`, height: "100%", backgroundColor: tone, borderRadius: 999 }} />
      </View>
    </View>
  );
}

function GoalCard({
  goal, onContribute,
}: {
  goal: SavingsGoal; onContribute: () => void;
}) {
  const pct = Math.min(Math.round((goal.current / Math.max(goal.target, 1)) * 100), 100);
  return (
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", padding: 14, backgroundColor: "#FAFAF8", marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{goal.name}</Text>
          <Text style={{ marginTop: 3, fontSize: 11, color: "#7F7C78" }}>{goal.owners.join(", ")} · {goal.deadline}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <View style={{ borderRadius: 999, backgroundColor: "#E6F1EB", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F7E5A" }}>{pct}%</Text>
          </View>
          <TouchableOpacity onPress={onContribute} activeOpacity={0.8} style={{ borderRadius: 999, backgroundColor: "#F47A21", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "white" }}>+ Abonar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: "#7F7C78" }}>{formatCurrency(goal.current)} ahorrado</Text>
        <Text style={{ fontSize: 11, color: "#7F7C78" }}>Meta {formatCurrency(goal.target)}</Text>
      </View>
      <View style={{ marginTop: 8, height: 7, borderRadius: 999, backgroundColor: "#F0EBE5", overflow: "hidden" }}>
        <View style={{ width: `${Math.max(pct, 2)}%`, height: "100%", backgroundColor: "#2F7E5A", borderRadius: 999 }} />
      </View>
    </View>
  );
}

function AllowanceCard({
  allowance, onEdit,
}: {
  allowance: AllowanceSummary; onEdit: () => void;
}) {
  return (
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", padding: 14, backgroundColor: "#FAFAF8", marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{allowance.childName}</Text>
          <Text style={{ marginTop: 3, fontSize: 11, color: "#7F7C78" }}>{allowance.streak}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <View style={{ borderRadius: 999, backgroundColor: "#E6F1EB", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#2F7E5A" }}>{formatCurrency(allowance.weeklyAmount)}/sem</Text>
          </View>
          <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#8E7D6B" }}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: "#F3EEE8", padding: 10 }}>
          <Text style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "#7F7C78" }}>Ahorrado</Text>
          <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "800", color: "#101111" }}>{formatCurrency(allowance.saved)}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: "#F3EEE8", padding: 10 }}>
          <Text style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "#7F7C78" }}>Disponible</Text>
          <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "800", color: "#101111" }}>{formatCurrency(allowance.available)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Member picker sheet (shared) ─────────────────────────────────────────────

function MemberPickerSheet({
  visible,
  members,
  selected,
  onSelect,
  onClose,
  title = "Seleccionar persona",
}: {
  visible: boolean;
  members: MemberSummary[];
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  title?: string;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity onPress={onClose} activeOpacity={1} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#F5F0EA", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 14, paddingBottom: 34 }}>
          <View style={{ alignItems: "center", paddingBottom: 10 }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)" }} />
          </View>
          <Text style={{ paddingHorizontal: 20, fontSize: 14, fontWeight: "800", color: "#101111", marginBottom: 10 }}>{title}</Text>
          <ScrollView style={{ maxHeight: 340 }}>
            {members.map((m) => {
              const active = selected === m.name;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { onSelect(m.name); onClose(); }}
                  activeOpacity={0.85}
                  style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: active ? "rgba(47,126,90,0.08)" : "transparent" }}
                >
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: active ? "800" : "600", color: active ? "#2F7E5A" : "#101111" }}>{m.name}</Text>
                    <Text style={{ fontSize: 11, color: "#A7A39D", marginTop: 1 }}>{m.role}</Text>
                  </View>
                  {active ? <Text style={{ color: "#2F7E5A", fontWeight: "700" }}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
            {members.length === 0 ? (
              <Text style={{ paddingHorizontal: 20, paddingVertical: 16, fontSize: 13, color: "#A7A39D" }}>No hay miembros registrados.</Text>
            ) : null}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function FinancesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const {
    subscriptions, fixedExpenses, expenses, budgetTotal,
    setSubscriptions, setFixedExpenses, setExpenses, setBudgetTotal,
    recurringPayments, markAsPaid, skipPayment, getMonthRecord,
    addRecurringPayment, updateRecurringPayment, deleteRecurringPayment,
  } = useFinances();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<QuickSection>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>({ title: "", amount: "", category: "Otros", spentAt: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  // Budget edit
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(budgetTotal));

  // Cobros recurrentes — paid tracking + edit
  const [cobroPaid, setCobroPaid] = useState<Set<string>>(new Set());
  const [editingCobroId, setEditingCobroId] = useState<string | null>(null);
  const [editCobroAmount, setEditCobroAmount] = useState("");

  // Persist cobroPaid across sessions
  useEffect(() => {
    AsyncStorage.getItem("noma-cobro-paid").then((raw) => {
      if (raw) { try { setCobroPaid(new Set(JSON.parse(raw) as string[])); } catch {} }
    });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem("noma-cobro-paid", JSON.stringify([...cobroPaid]));
  }, [cobroPaid]);

  // Programado form
  const [showProgramadoForm, setShowProgramadoForm] = useState(false);
  const [programadoDraft, setProgramadoDraft] = useState<ProgramadoDraft>({ name: "", amount: "", kind: "fixed", dayOfMonth: "", category: "Hogar", notifyDaysBefore: "3" });
  const [editingProgramadoId, setEditingProgramadoId] = useState<string | null>(null);
  const [editProgramadoDraft, setEditProgramadoDraft] = useState({ amount: "", dayOfMonth: "" });

  // Goal form + contribute
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({ name: "", target: "", deadline: "" });
  const [savingGoal, setSavingGoal] = useState(false);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [contributeDraft, setContributeDraft] = useState<ContributeDraft>({ goalId: "", goalName: "", amount: "" });
  const [localGoals, setLocalGoals] = useState<SavingsGoal[]>([]);

  // Allowance form + edit
  const [showAllowanceForm, setShowAllowanceForm] = useState(false);
  const [allowanceDraft, setAllowanceDraft] = useState<AllowanceDraft>({ childName: "", weeklyAmount: "" });
  const [allowanceMemberPickerOpen, setAllowanceMemberPickerOpen] = useState(false);
  const [savingAllowance, setSavingAllowance] = useState(false);
  const [editingAllowanceId, setEditingAllowanceId] = useState<string | null>(null);
  const [editAllowanceAmount, setEditAllowanceAmount] = useState("");
  const [localAllowances, setLocalAllowances] = useState<AllowanceSummary[]>([]);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: DashboardData } & Partial<DashboardData>>(
        "/api/dashboard",
        { token: session.token },
      );
      const d: DashboardData = (raw as any).data ?? (raw as unknown as DashboardData);
      setData(d);
      const finances = d.finances;
      setSubscriptions(finances?.subscriptions ?? []);
      setFixedExpenses(finances?.fixedExpenses ?? []);
      setExpenses(d.expenses ?? []);
      if ((finances?.budgetTotal ?? 0) > 0) {
        setBudgetTotal(finances.budgetTotal);
        setBudgetDraft(String(finances.budgetTotal));
      }
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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const bills = data?.finances?.bills ?? [];
  const categories = data?.finances?.categories ?? [];
  const apiGoals = data?.finances?.savingsGoals ?? [];
  const apiAllowances = data?.finances?.allowances ?? [];
  const members = data?.members ?? [];

  // Merge local + API, with local overriding API (same id = edited version)
  const goals = useMemo(() => {
    const localIds = new Set(localGoals.map((g) => g.id));
    return [...apiGoals.filter((g) => !localIds.has(g.id)), ...localGoals];
  }, [apiGoals, localGoals]);

  const allowances = useMemo(() => {
    const localIds = new Set(localAllowances.map((a) => a.id));
    return [...apiAllowances.filter((a) => !localIds.has(a.id)), ...localAllowances];
  }, [apiAllowances, localAllowances]);

  // Programados activos cuentan como FIJO
  const activeRecurring = useMemo(
    () => recurringPayments.filter((p) => p.active),
    [recurringPayments]
  );

  // FIJO = gastos fijos del API + suscripciones + facturas + TODOS los programados activos
  const totalMonthlyFixed = useMemo(
    () =>
      fixedExpenses.reduce((sum, item) => sum + item.amount, 0) +
      subscriptions.reduce((sum, item) => sum + item.amount, 0) +
      bills.reduce((sum, item) => sum + item.amount, 0) +
      activeRecurring.reduce((sum, p) => sum + p.amount, 0),
    [fixedExpenses, subscriptions, bills, activeRecurring]
  );

  // VARIABLE = solo gastos manuales (excluir los generados al marcar programado o cobro como pagado)
  const totalSpentMonth = useMemo(
    () =>
      expenses
        .filter((e) => {
          if (e.id.startsWith("exp-rp-")) return false;    // programados — ya en FIJO
          if (e.id.startsWith("exp-cobro-")) return false; // cobros — ya en FIJO
          const d = new Date(e.spentAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, currentMonth, currentYear]
  );

  const totalUsed = totalMonthlyFixed + totalSpentMonth;
  const remaining = Math.max(budgetTotal - totalUsed, 0);
  const budgetUsedPct = budgetTotal > 0 ? Math.min(Math.round((totalUsed / budgetTotal) * 100), 100) : 0;
  const variableSpend = totalSpentMonth;
  const warningBills = bills.filter((b) => b.status === "warning");
  const warningSubs = subscriptions.filter((s) => s.status === "warning");
  const alertCount = warningBills.length + warningSubs.length;
  const viewerInitials = (session?.name ?? "").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  // Gastos recientes = solo gastos manuales (exp-rp- se omiten del historial de "Variables")
  const recentExpenses = expenses.filter((e) => !e.id.startsWith("exp-rp-")).slice(0, 8);
  const monthLabel = data?.finances?.monthLabel ?? formatMonthLabel(now);

  const recurringItems = useMemo<RecurringPreview[]>(() => [
    ...bills.map((b) => ({ id: `bill-${b.id}`, name: b.name, amount: b.amount, subtitle: b.dueLabel, status: b.status, kind: "bill" as const })),
    ...fixedExpenses.map((i) => ({ id: `fixed-${i.id}`, name: i.name, amount: i.amount, subtitle: `${i.cadence} · ${i.nextCharge}`, status: "ok" as const, kind: "fixed" as const })),
    ...subscriptions.map((i) => ({ id: `sub-${i.id}`, name: i.name, amount: i.amount, subtitle: i.renewsIn, status: i.status, kind: "subscription" as const })),
  ], [bills, fixedExpenses, subscriptions]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddExpense() {
    if (!expenseDraft.title || !expenseDraft.amount) return;
    setSaving(true);
    const newExpense: ExpenseSummary = {
      id: `exp-${Date.now()}`,
      title: expenseDraft.title,
      amount: Number(expenseDraft.amount),
      category: expenseDraft.category,
      spentAt: expenseDraft.spentAt,
    };
    setExpenses((c) => [newExpense, ...c]);
    try {
      await apiFetch("/api/finances", { method: "POST", token: session?.token, body: JSON.stringify({ type: "expense", ...newExpense }) });
    } catch {}
    setExpenseDraft({ title: "", amount: "", category: "Otros", spentAt: new Date().toISOString().slice(0, 10) });
    setShowExpenseForm(false);
    setSaving(false);
  }

  function cobroPaidKey(id: string) { return `${id}-${currentMonth}-${currentYear}`; }

  function handleMarkCobroPaid(item: RecurringPreview) {
    const key = cobroPaidKey(item.id);
    if (cobroPaid.has(key)) return;
    setCobroPaid((c) => new Set([...c, key]));
    // Use deterministic id so we can remove this entry if the cobro is deleted later
    const expId = `exp-cobro-${key}`;
    setExpenses((c) => {
      if (c.some((e) => e.id === expId)) return c; // guard against double-insert
      return [{
        id: expId,
        title: item.name,
        amount: item.amount,
        category: "Servicios",
        spentAt: new Date().toISOString().slice(0, 10),
      }, ...c];
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSaveCobro(item: RecurringPreview) {
    const newAmount = Number(editCobroAmount);
    if (!newAmount || newAmount <= 0) { setEditingCobroId(null); return; }
    const rawId = item.id.replace(/^(bill-|fixed-|sub-)/, "");
    if (item.id.startsWith("sub-")) {
      setSubscriptions((c) => c.map((s) => s.id === rawId ? { ...s, amount: newAmount } : s));
    } else if (item.id.startsWith("fixed-")) {
      setFixedExpenses((c) => c.map((f) => f.id === rawId ? { ...f, amount: newAmount } : f));
    }
    // If already marked paid this month, update the recorded expense amount too
    const key = cobroPaidKey(item.id);
    if (cobroPaid.has(key)) {
      setExpenses((c) => c.map((e) => e.id === `exp-cobro-${key}` ? { ...e, amount: newAmount } : e));
    }
    setEditingCobroId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleDeleteCobro(item: RecurringPreview) {
    const rawId = item.id.replace(/^(bill-|fixed-|sub-)/, "");
    if (item.id.startsWith("sub-")) {
      setSubscriptions((c) => c.filter((s) => s.id !== rawId));
    } else if (item.id.startsWith("fixed-")) {
      setFixedExpenses((c) => c.filter((f) => f.id !== rawId));
    }
    // Remove the paid expense entry recorded this month (if any)
    const key = cobroPaidKey(item.id);
    setExpenses((c) => c.filter((e) => e.id !== `exp-cobro-${key}`));
    setCobroPaid((c) => { const next = new Set(c); next.delete(key); return next; });
    if (editingCobroId === item.id) setEditingCobroId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleAddProgramado() {
    if (!programadoDraft.name || !programadoDraft.amount || !programadoDraft.dayOfMonth) return;
    addRecurringPayment({
      name: programadoDraft.name,
      amount: Number(programadoDraft.amount),
      dayOfMonth: Number(programadoDraft.dayOfMonth),
      category: programadoDraft.category,
      kind: programadoDraft.kind,
      notifyDaysBefore: Number(programadoDraft.notifyDaysBefore),
      active: true,
    });
    // Also register as a fixed expense in the context so it's persisted in FIJO
    if (programadoDraft.kind === "fixed" || programadoDraft.kind === "service") {
      setFixedExpenses((c) => [
        ...c,
        {
          id: `fixed-rp-${Date.now()}`,
          name: programadoDraft.name,
          amount: Number(programadoDraft.amount),
          cadence: "Mensual",
          nextCharge: `Día ${programadoDraft.dayOfMonth} de cada mes`,
        },
      ]);
    }
    setProgramadoDraft({ name: "", amount: "", kind: "fixed", dayOfMonth: "", category: "Hogar", notifyDaysBefore: "3" });
    setShowProgramadoForm(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function handleAddGoal() {
    if (!goalDraft.name || !goalDraft.target) return;
    setSavingGoal(true);
    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: goalDraft.name,
      target: Number(goalDraft.target),
      current: 0,
      owners: [session?.name ?? "Yo"],
      deadline: goalDraft.deadline || "Sin fecha",
    };
    setLocalGoals((c) => [...c, newGoal]);
    try {
      await apiFetch("/api/finances", { method: "POST", token: session?.token, body: JSON.stringify({ type: "savingsGoal", ...newGoal }) });
    } catch {}
    setGoalDraft({ name: "", target: "", deadline: "" });
    setShowGoalForm(false);
    setSavingGoal(false);
  }

  function handleOpenContribute(goal: SavingsGoal) {
    setContributeDraft({ goalId: goal.id, goalName: goal.name, amount: "" });
    setShowContributeForm(true);
  }

  function handleContributeGoal() {
    const amount = Number(contributeDraft.amount);
    if (!contributeDraft.goalId || !(amount > 0)) return;

    const isLocal = localGoals.some((g) => g.id === contributeDraft.goalId);
    if (isLocal) {
      setLocalGoals((c) => c.map((g) => g.id === contributeDraft.goalId ? { ...g, current: g.current + amount } : g));
    } else {
      const apiGoal = apiGoals.find((g) => g.id === contributeDraft.goalId);
      if (apiGoal) {
        setLocalGoals((c) => [...c, { ...apiGoal, current: apiGoal.current + amount }]);
      }
    }
    setContributeDraft({ goalId: "", goalName: "", amount: "" });
    setShowContributeForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleAddAllowance() {
    if (!allowanceDraft.childName || !allowanceDraft.weeklyAmount) return;
    setSavingAllowance(true);
    const newAllowance: AllowanceSummary = {
      id: `allowance-${Date.now()}`,
      childName: allowanceDraft.childName,
      weeklyAmount: Number(allowanceDraft.weeklyAmount),
      saved: 0,
      available: Number(allowanceDraft.weeklyAmount),
      streak: "Semana 1",
    };
    setLocalAllowances((c) => [...c, newAllowance]);
    try {
      await apiFetch("/api/finances", { method: "POST", token: session?.token, body: JSON.stringify({ type: "allowance", ...newAllowance }) });
    } catch {}
    setAllowanceDraft({ childName: "", weeklyAmount: "" });
    setShowAllowanceForm(false);
    setSavingAllowance(false);
  }

  function handleOpenEditAllowance(allowance: AllowanceSummary) {
    setEditingAllowanceId(allowance.id);
    setEditAllowanceAmount(String(allowance.weeklyAmount));
  }

  function handleSaveEditAllowance() {
    const amount = Number(editAllowanceAmount);
    if (!editingAllowanceId || !(amount > 0)) return;

    const isLocal = localAllowances.some((a) => a.id === editingAllowanceId);
    if (isLocal) {
      setLocalAllowances((c) =>
        c.map((a) => a.id === editingAllowanceId ? { ...a, weeklyAmount: amount, available: amount } : a)
      );
    } else {
      const apiAllowance = apiAllowances.find((a) => a.id === editingAllowanceId);
      if (apiAllowance) {
        setLocalAllowances((c) => [...c, { ...apiAllowance, weeklyAmount: amount, available: amount }]);
      }
    }
    setEditingAllowanceId(null);
    setEditAllowanceAmount("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSaveBudget() {
    const value = Number(budgetDraft.replace(/\D/g, ""));
    if (value > 0) { setBudgetTotal(value); setBudgetDraft(String(value)); }
    setEditingBudget(false);
  }

  function toggleSection(section: QuickSection) {
    setActiveSection((c) => c === section ? null : section);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
      <AppHeader viewerInitials={viewerInitials} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 34, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7655" />}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={{ borderRadius: 30, overflow: "hidden", backgroundColor: "#173F2E", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, shadowColor: "#0D7655", shadowOpacity: 0.24, shadowRadius: 22, shadowOffset: { width: 0, height: 6 }, elevation: 7 }}>

          {/* Top row: text left + image right */}
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "rgba(240,246,242,0.52)" }}>
                PULSO DEL MES · {monthLabel.toUpperCase()}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
                style={{ marginTop: 12, fontSize: 36, lineHeight: 44, fontWeight: "800", color: "white" }}
              >
                {formatCurrency(totalUsed)}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 18, color: "rgba(239,244,241,0.62)" }}>de {formatCurrency(budgetTotal)} · quedan</Text>
              <Text style={{ marginTop: 3, fontSize: 13, fontWeight: "800", color: "#FF7A1F" }}>{formatCurrency(remaining)}</Text>
            </View>

            <Image source={HERO_FINANCE} resizeMode="contain" style={{ width: 148, height: 148, flexShrink: 0, marginBottom: 4 }} />
          </View>

          <View style={{ marginTop: 20 }}>
            <GradientProgressBar progress={budgetUsedPct} />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            {[
              { label: "FIJO", value: formatCurrency(totalMonthlyFixed), icon: <WalletMiniIcon /> },
              { label: "VARIABLE", value: formatCurrency(variableSpend), icon: <TrendMiniIcon /> },
              { label: "USADO", value: `${budgetUsedPct}%`, icon: <UsedMiniIcon /> },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.10)", paddingHorizontal: 12, paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {item.icon}
                  <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(240,246,242,0.56)" }}>{item.label}</Text>
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={{ marginTop: 8, fontSize: 12, fontWeight: "800", color: "white" }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <TouchableOpacity onPress={() => setShowExpenseForm(true)} activeOpacity={0.85} style={{ flex: 1, borderRadius: 999, backgroundColor: "#F47A21", paddingVertical: 16, alignItems: "center", shadowColor: "#F47A21", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: "white" }}>+ Registrar gasto</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingBudget((c) => !c)} activeOpacity={0.85} style={{ borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(240,246,242,0.20)", paddingHorizontal: 28, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "white" }}>Presupuesto</Text>
            </TouchableOpacity>
          </View>

          {editingBudget ? (
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput value={budgetDraft} onChangeText={setBudgetDraft} keyboardType="numeric" autoFocus style={{ flex: 1, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, paddingVertical: 12, color: "white", fontSize: 12, fontWeight: "700" }} placeholder="4200000" placeholderTextColor="rgba(255,255,255,0.35)" />
              <TouchableOpacity onPress={handleSaveBudget} activeOpacity={0.8} style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Gastos / Distribución ─────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <FinanceQuickCard icon={<MoneyIcon />} title="Gastos" badge={`${recentExpenses.length} movs`} active={activeSection === "gastos"} onPress={() => toggleSection("gastos")} />
          <FinanceQuickCard icon={<DistributionIcon />} title="Distribución" badge={`${categories.length} categ`} active={activeSection === "distribucion"} onPress={() => toggleSection("distribucion")} />
        </View>

        {activeSection === "gastos" ? (
          <ExpandedSection title="Gastos variables recientes">
            {recentExpenses.length === 0 ? (
              <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin gastos variables registrados.</Text>
            ) : (
              recentExpenses.map((e, i) => (
                <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F2EC", alignItems: "center", justifyContent: "center" }}>
                    <MoneyIcon />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{e.title}</Text>
                    <Text style={{ marginTop: 2, fontSize: 11, color: "#7F7C78" }}>{e.category} · {e.spentAt}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatCurrency(e.amount)}</Text>
                </View>
              ))
            )}
          </ExpandedSection>
        ) : null}

        {activeSection === "distribucion" ? (
          <ExpandedSection title="Distribución del gasto">
            {categories.length === 0 ? <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin categorías disponibles.</Text> : categories.map((c) => <CategoryRow key={c.id} item={c} />)}
          </ExpandedSection>
        ) : null}

        {/* ── Alertas / Cobros ──────────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <FinanceQuickCard
            icon={
              <View>
                <AlertIcon />
                {alertCount > 0 ? (
                  <View style={{ position: "absolute", right: -6, top: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#F47A21", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "white" }}>{alertCount}</Text>
                  </View>
                ) : null}
              </View>
            }
            title="Alertas"
            badge={alertCount > 0 ? `${alertCount} activas` : "Sin alertas"}
            badgeTone={alertCount > 0 ? "orange" : "muted"}
            active={activeSection === "alertas"}
            onPress={() => toggleSection("alertas")}
          />
          <FinanceQuickCard icon={<FlowIcon />} title="Cobros" badge={`${recurringItems.length} activos`} active={activeSection === "cobros"} onPress={() => toggleSection("cobros")} />
        </View>

        {activeSection === "alertas" ? (
          <ExpandedSection title="Alertas financieras">
            {alertCount === 0 ? (
              <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin alertas activas. Todo al día.</Text>
            ) : (
              [...warningBills.map((b) => ({ name: b.name, amount: b.amount, subtitle: b.dueLabel })), ...warningSubs.map((s) => ({ name: s.name, amount: s.amount, subtitle: s.renewsIn }))].map((item) => (
                <View key={`${item.name}-${item.subtitle}`} style={{ borderRadius: 18, backgroundColor: "rgba(244,122,33,0.08)", borderWidth: 1, borderColor: "rgba(244,122,33,0.16)", padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{item.name}</Text>
                      <Text style={{ marginTop: 3, fontSize: 11, color: "#F47A21" }}>{item.subtitle}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatCurrency(item.amount)}</Text>
                  </View>
                </View>
              ))
            )}
          </ExpandedSection>
        ) : null}

        {activeSection === "cobros" ? (
          <ExpandedSection title="Cobros recurrentes">
            {recurringItems.length === 0 ? (
              <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin cobros registrados.</Text>
            ) : (
              recurringItems.map((item, i) => {
                const isPaid = cobroPaid.has(cobroPaidKey(item.id));
                const isEditing = editingCobroId === item.id;
                return (
                  <View key={item.id} style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
                    {/* Row principal */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <RecurringServiceIcon
                        name={item.name}
                        size={40}
                        statusBadge={isPaid ? (
                          <View style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: "#0D7655", borderWidth: 1.5, borderColor: "white", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color: "white", fontSize: 8, fontWeight: "900" }}>✓</Text>
                          </View>
                        ) : undefined}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{item.name}</Text>
                        <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 11, color: "#7F7C78" }}>{item.subtitle}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatCurrency(item.amount)}</Text>
                        {isPaid ? (
                          <View style={{ marginTop: 4, borderRadius: 999, backgroundColor: "rgba(13,118,85,0.1)", paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#0D7655" }}>Pagado ✓</Text>
                          </View>
                        ) : item.status === "warning" ? (
                          <View style={{ marginTop: 4, borderRadius: 999, backgroundColor: "rgba(244,122,33,0.12)", paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#F47A21" }}>Pronto</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Acciones */}
                    {!isPaid && (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => handleMarkCobroPaid(item)}
                          activeOpacity={0.85}
                          style={{ flex: 1, borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 10, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Marcar pagado</Text>
                        </TouchableOpacity>
                        {!item.id.startsWith("bill-") && (
                          <>
                            <TouchableOpacity
                              onPress={() => {
                                if (isEditing) { setEditingCobroId(null); return; }
                                setEditingCobroId(item.id);
                                setEditCobroAmount(String(item.amount));
                              }}
                              activeOpacity={0.85}
                              style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: "700", color: "#7F7C78" }}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteCobro(item)}
                              activeOpacity={0.85}
                              style={{ borderRadius: 999, backgroundColor: "rgba(220,38,38,0.08)", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}
                            >
                              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#DC2626" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                              </Svg>
                            </TouchableOpacity>
                          </>
                        )}
                        {item.id.startsWith("bill-") && (
                          <TouchableOpacity
                            onPress={() => {
                              if (isEditing) { setEditingCobroId(null); return; }
                              setEditingCobroId(item.id);
                              setEditCobroAmount(String(item.amount));
                            }}
                            activeOpacity={0.85}
                            style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#7F7C78" }}>Editar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Inline edit */}
                    {isEditing && (
                      <View style={{ marginTop: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <View style={{ flex: 1, backgroundColor: "#F9F6F2", borderRadius: 12, borderWidth: 1, borderColor: "#E8E3DC", paddingHorizontal: 12, paddingVertical: 9 }}>
                          <TextInput
                            value={editCobroAmount}
                            onChangeText={setEditCobroAmount}
                            keyboardType="numeric"
                            placeholder="Nuevo monto"
                            placeholderTextColor="#C4C0B8"
                            style={{ fontSize: 13, fontWeight: "600", color: "#101111" }}
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => handleSaveCobro(item)}
                          activeOpacity={0.85}
                          style={{ borderRadius: 12, backgroundColor: "#0D7655", paddingVertical: 10, paddingHorizontal: 16 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Guardar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ExpandedSection>
        ) : null}

        {/* ── Pagos programados ─────────────────────────────────────────────── */}
        <FinanceAccordionRow
          icon={<SparkIcon />}
          title="Pagos programados"
          subtitle={activeRecurring.length > 0 ? `${activeRecurring.length} activos · cuentan como gasto fijo mensual` : "Crea compromisos fijos sin registrarlos manualmente"}
          open={activeSection === "programados"}
          onPress={() => toggleSection("programados")}
        />

        {activeSection === "programados" ? (
          <ExpandedSection title="Pagos programados" onAdd={() => setShowProgramadoForm(true)} addLabel="+ Nuevo">
            {activeRecurring.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin pagos programados.</Text>
              </View>
            ) : (
              activeRecurring.map((payment, i) => {
                const record = getMonthRecord(payment.id, currentMonth, currentYear);
                const isPaid = record?.status === "paid";
                const isSkipped = record?.status === "skipped";
                const isEditing = editingProgramadoId === payment.id;
                return (
                  <View key={payment.id} style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <RecurringServiceIcon
                        name={payment.name}
                        size={40}
                        statusBadge={
                          <View style={{
                            position: "absolute", bottom: -2, right: -2,
                            width: 16, height: 16, borderRadius: 8,
                            backgroundColor: isPaid ? "#0D7655" : isSkipped ? "#A7A39D" : "#F47A21",
                            borderWidth: 1.5, borderColor: "white",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Text style={{ color: "white", fontSize: 8, fontWeight: "900" }}>
                              {isPaid ? "✓" : isSkipped ? "↷" : "•"}
                            </Text>
                          </View>
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#101111" }}>{payment.name}</Text>
                        <Text style={{ marginTop: 2, fontSize: 11, color: "#7F7C78" }}>Día {payment.dayOfMonth} · {kindLabels[payment.kind]} · FIJO</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#101111" }}>{formatCurrency(payment.amount)}</Text>
                    </View>

                    {!isPaid && !isSkipped ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => { markAsPaid(payment.id, currentMonth, currentYear); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                          activeOpacity={0.85}
                          style={{ flex: 1, borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 10, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Marcar pagado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => skipPayment(payment.id, currentMonth, currentYear)} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#7F7C78" }}>Saltar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setEditingProgramadoId(isEditing ? null : payment.id); setEditProgramadoDraft({ amount: String(payment.amount), dayOfMonth: String(payment.dayOfMonth) }); }}
                          activeOpacity={0.85}
                          style={{ borderRadius: 999, backgroundColor: "#F3EEE8", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#7F7C78" }}>Editar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ marginTop: 8 }}>
                        <View style={{ borderRadius: 999, alignSelf: "flex-start", backgroundColor: isPaid ? "rgba(13,118,85,0.1)" : "#F3EEE8", paddingHorizontal: 12, paddingVertical: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: isPaid ? "#2F7E5A" : "#7F7C78" }}>{isPaid ? "Pagado este mes ✓" : "Saltado este mes"}</Text>
                        </View>
                      </View>
                    )}

                    {isEditing ? (
                      <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: "#F7F4F0", padding: 12, gap: 10 }}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TextInput value={editProgramadoDraft.amount} onChangeText={(v) => setEditProgramadoDraft((c) => ({ ...c, amount: v }))} keyboardType="numeric" placeholder="Monto" placeholderTextColor="#B8B2AA" style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 10, color: "#101111" }} />
                          <TextInput value={editProgramadoDraft.dayOfMonth} onChangeText={(v) => setEditProgramadoDraft((c) => ({ ...c, dayOfMonth: v }))} keyboardType="numeric" placeholder="Día" placeholderTextColor="#B8B2AA" style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 10, color: "#101111" }} />
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity onPress={() => { updateRecurringPayment(payment.id, { amount: Number(editProgramadoDraft.amount) || payment.amount, dayOfMonth: Number(editProgramadoDraft.dayOfMonth) || payment.dayOfMonth }); setEditingProgramadoId(null); }} activeOpacity={0.85} style={{ flex: 1, borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 10, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>Guardar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditingProgramadoId(null)} activeOpacity={0.85} style={{ flex: 1, borderRadius: 999, backgroundColor: "white", paddingVertical: 10, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#7F7C78" }}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { deleteRecurringPayment(payment.id); setEditingProgramadoId(null); }} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "rgba(239,68,68,0.10)", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>Eliminar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ExpandedSection>
        ) : null}

        {/* ── Calendario ───────────────────────────────────────────────────── */}
        <FinanceAccordionRow icon={<CalendarIcon />} title="Nunca olvides un pago" subtitle="Suscripciones, servicios y cargos recurrentes" dark chevronOnly onPress={() => router.push("/(app)/finances/calendar")} />

        {/* ── Metas ────────────────────────────────────────────────────────── */}
        <FinanceAccordionRow
          icon={<GoalIcon />}
          title="Metas y fondos comunes"
          subtitle={goals.length > 0 ? `${goals.length} metas activas` : "Ahorros compartidos del hogar"}
          badge={goals.length > 0 ? `${goals.length} metas` : undefined}
          open={activeSection === "metas"}
          onPress={() => toggleSection("metas")}
        />

        {activeSection === "metas" ? (
          <ExpandedSection title="Metas y fondos comunes" onAdd={() => setShowGoalForm(true)} addLabel="+ Nueva meta">
            {goals.length === 0 ? (
              <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin metas configuradas.</Text>
            ) : (
              goals.map((g) => (
                <GoalCard key={g.id} goal={g} onContribute={() => handleOpenContribute(g)} />
              ))
            )}
          </ExpandedSection>
        ) : null}

        {/* ── Mesadas ──────────────────────────────────────────────────────── */}
        <FinanceAccordionRow
          icon={<MesadasIcon />}
          title="Mesadas"
          subtitle={allowances.length > 0 ? `${allowances.length} activas` : "Controla ahorro y disponible de cada miembro"}
          badge={allowances.length > 0 ? `${allowances.length} activas` : undefined}
          open={activeSection === "mesadas"}
          onPress={() => toggleSection("mesadas")}
        />

        {activeSection === "mesadas" ? (
          <ExpandedSection title="Mesadas" onAdd={() => setShowAllowanceForm(true)} addLabel="+ Nueva mesada">
            {allowances.length === 0 ? (
              <Text style={{ color: "#A7A39D", fontSize: 11 }}>Sin mesadas configuradas.</Text>
            ) : (
              allowances.map((a) => (
                <AllowanceCard key={a.id} allowance={a} onEdit={() => handleOpenEditAllowance(a)} />
              ))
            )}
          </ExpandedSection>
        ) : null}
      </ScrollView>

      {/* ══ Modals ══════════════════════════════════════════════════════════════ */}

      {/* Registrar gasto */}
      <Modal visible={showExpenseForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowExpenseForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Registrar gasto variable</Text>
            <TouchableOpacity onPress={() => setShowExpenseForm(false)}><Text style={{ color: "#8E8880" }}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 28 }}>
              <TextInput value={expenseDraft.title} onChangeText={(v) => setExpenseDraft((c) => ({ ...c, title: v }))} style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Supermercado, taxi..." placeholderTextColor="#B8B2AA" />
              <TextInput value={expenseDraft.amount} onChangeText={(v) => setExpenseDraft((c) => ({ ...c, amount: v }))} keyboardType="numeric" style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="50000" placeholderTextColor="#B8B2AA" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8, paddingBottom: 2 }}>
                  {categoryOptions.map((cat) => {
                    const active = expenseDraft.category === cat;
                    return (
                      <TouchableOpacity key={cat} onPress={() => setExpenseDraft((c) => ({ ...c, category: cat }))} activeOpacity={0.85} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: active ? "#0D7655" : "white" }}>
                        <Text style={{ color: active ? "white" : "#101111", fontWeight: "600", fontSize: 12 }}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ borderRadius: 14, backgroundColor: "rgba(13,118,85,0.07)", padding: 12 }}>
                <Text style={{ fontSize: 11, color: "#2F7E5A" }}>Solo registra gastos variables (compras, salidas, imprevistos). Los compromisos fijos van en "Pagos programados".</Text>
              </View>
              <TouchableOpacity onPress={handleAddExpense} disabled={saving || !expenseDraft.title || !expenseDraft.amount} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 16, alignItems: "center", opacity: saving || !expenseDraft.title || !expenseDraft.amount ? 0.6 : 1 }}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Registrar gasto</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Nuevo pago programado (gasto fijo) */}
      <Modal visible={showProgramadoForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProgramadoForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Nuevo gasto fijo</Text>
              <Text style={{ marginTop: 2, fontSize: 11, color: "#A7A39D" }}>Se sumará automáticamente al total fijo mensual</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProgramadoForm(false)}><Text style={{ color: "#8E8880" }}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 28 }}>
              <TextInput value={programadoDraft.name} onChangeText={(v) => setProgramadoDraft((c) => ({ ...c, name: v }))} style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Netflix, arriendo, gym..." placeholderTextColor="#B8B2AA" />
              <TextInput value={programadoDraft.amount} onChangeText={(v) => setProgramadoDraft((c) => ({ ...c, amount: v }))} keyboardType="numeric" style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Monto mensual" placeholderTextColor="#B8B2AA" />
              <TextInput value={programadoDraft.dayOfMonth} onChangeText={(v) => setProgramadoDraft((c) => ({ ...c, dayOfMonth: v }))} keyboardType="numeric" style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Día de cobro (ej. 15)" placeholderTextColor="#B8B2AA" />
              <View>
                <Text style={{ marginBottom: 8, fontSize: 11, fontWeight: "700", color: "#A7A39D", letterSpacing: 1.4 }}>TIPO</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["fixed", "subscription", "service"] as ProgramadoDraft["kind"][]).map((kind) => {
                    const active = programadoDraft.kind === kind;
                    return (
                      <TouchableOpacity key={kind} onPress={() => setProgramadoDraft((c) => ({ ...c, kind }))} activeOpacity={0.85} style={{ flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: active ? "#0D7655" : "white", borderWidth: active ? 0 : 1, borderColor: "rgba(0,0,0,0.07)" }}>
                        <Text style={{ color: active ? "white" : "#101111", fontSize: 11, fontWeight: "700" }}>{kindLabels[kind]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8, paddingBottom: 2 }}>
                  {categoryOptions.map((cat) => {
                    const active = programadoDraft.category === cat;
                    return (
                      <TouchableOpacity key={cat} onPress={() => setProgramadoDraft((c) => ({ ...c, category: cat }))} activeOpacity={0.85} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: active ? "#0D7655" : "white", borderWidth: active ? 0 : 1, borderColor: "rgba(0,0,0,0.07)" }}>
                        <Text style={{ color: active ? "white" : "#101111", fontWeight: "600", fontSize: 12 }}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <TouchableOpacity onPress={handleAddProgramado} disabled={!programadoDraft.name || !programadoDraft.amount || !programadoDraft.dayOfMonth} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 16, alignItems: "center", opacity: !programadoDraft.name || !programadoDraft.amount || !programadoDraft.dayOfMonth ? 0.6 : 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Agregar gasto fijo</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Nueva meta de ahorro */}
      <Modal visible={showGoalForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Nueva meta de ahorro</Text>
            <TouchableOpacity onPress={() => setShowGoalForm(false)}><Text style={{ color: "#8E8880" }}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 28 }}>
              <TextInput value={goalDraft.name} onChangeText={(v) => setGoalDraft((c) => ({ ...c, name: v }))} style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Vacaciones, fondo de emergencia..." placeholderTextColor="#B8B2AA" />
              <TextInput value={goalDraft.target} onChangeText={(v) => setGoalDraft((c) => ({ ...c, target: v }))} keyboardType="numeric" style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Monto objetivo (ej. 5000000)" placeholderTextColor="#B8B2AA" />
              <TextInput value={goalDraft.deadline} onChangeText={(v) => setGoalDraft((c) => ({ ...c, deadline: v }))} style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }} placeholder="Fecha límite (ej. Dic 2025)" placeholderTextColor="#B8B2AA" />
              <TouchableOpacity onPress={handleAddGoal} disabled={savingGoal || !goalDraft.name || !goalDraft.target} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 16, alignItems: "center", opacity: savingGoal || !goalDraft.name || !goalDraft.target ? 0.6 : 1 }}>
                {savingGoal ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Crear meta</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Abonar a meta */}
      <Modal visible={showContributeForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowContributeForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Abonar a meta</Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: "#A7A39D" }}>{contributeDraft.goalName}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowContributeForm(false)}><Text style={{ color: "#8E8880" }}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 28 }}>
              {(() => {
                const goal = goals.find((g) => g.id === contributeDraft.goalId);
                if (!goal) return null;
                const pct = Math.min(Math.round((goal.current / Math.max(goal.target, 1)) * 100), 100);
                return (
                  <View style={{ borderRadius: 18, backgroundColor: "white", padding: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, color: "#7F7C78" }}>{formatCurrency(goal.current)} ahorrado</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#2F7E5A" }}>{pct}% de {formatCurrency(goal.target)}</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 999, backgroundColor: "#F0EBE5", overflow: "hidden" }}>
                      <View style={{ width: `${Math.max(pct, 2)}%`, height: "100%", backgroundColor: "#2F7E5A", borderRadius: 999 }} />
                    </View>
                  </View>
                );
              })()}
              <TextInput
                value={contributeDraft.amount}
                onChangeText={(v) => setContributeDraft((c) => ({ ...c, amount: v }))}
                keyboardType="numeric"
                autoFocus
                style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111", fontSize: 20, fontWeight: "800", textAlign: "center" }}
                placeholder="0"
                placeholderTextColor="#B8B2AA"
              />
              <TouchableOpacity
                onPress={handleContributeGoal}
                disabled={!contributeDraft.amount || Number(contributeDraft.amount) <= 0}
                activeOpacity={0.85}
                style={{ borderRadius: 999, backgroundColor: "#F47A21", paddingVertical: 16, alignItems: "center", opacity: !contributeDraft.amount || Number(contributeDraft.amount) <= 0 ? 0.6 : 1, shadowColor: "#F47A21", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Confirmar abono</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Nueva mesada */}
      <Modal visible={showAllowanceForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAllowanceForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Nueva mesada</Text>
            <TouchableOpacity onPress={() => setShowAllowanceForm(false)}><Text style={{ color: "#8E8880" }}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 28 }}>
              <View>
                <Text style={{ marginBottom: 8, fontSize: 11, fontWeight: "700", color: "#A7A39D", letterSpacing: 1.4 }}>PERSONA</Text>
                <TouchableOpacity
                  onPress={() => setAllowanceMemberPickerOpen(true)}
                  activeOpacity={0.85}
                  style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <Text style={{ fontSize: 13, color: allowanceDraft.childName ? "#101111" : "#B8B2AA", fontWeight: allowanceDraft.childName ? "600" : "400" }}>
                    {allowanceDraft.childName || "Seleccionar persona registrada"}
                  </Text>
                  <Text style={{ color: "#A7A39D" }}>▾</Text>
                </TouchableOpacity>
              </View>
              <View>
                <Text style={{ marginBottom: 8, fontSize: 11, fontWeight: "700", color: "#A7A39D", letterSpacing: 1.4 }}>MESADA SEMANAL</Text>
                <TextInput
                  value={allowanceDraft.weeklyAmount}
                  onChangeText={(v) => setAllowanceDraft((c) => ({ ...c, weeklyAmount: v }))}
                  keyboardType="numeric"
                  style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111" }}
                  placeholder="Monto semanal (ej. 50000)"
                  placeholderTextColor="#B8B2AA"
                />
              </View>
              <View style={{ borderRadius: 14, backgroundColor: "#E6F1EB", padding: 14 }}>
                <Text style={{ fontSize: 11, color: "#2F7E5A", fontWeight: "600" }}>La mesada se acredita cada semana. El miembro puede ver su saldo disponible y ahorrado en su perfil.</Text>
              </View>
              <TouchableOpacity onPress={handleAddAllowance} disabled={savingAllowance || !allowanceDraft.childName || !allowanceDraft.weeklyAmount} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 16, alignItems: "center", opacity: savingAllowance || !allowanceDraft.childName || !allowanceDraft.weeklyAmount ? 0.6 : 1 }}>
                {savingAllowance ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Crear mesada</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Editar mesada */}
      <Modal visible={!!editingAllowanceId} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingAllowanceId(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#101111" }}>Editar mesada</Text>
              <Text style={{ marginTop: 3, fontSize: 12, color: "#A7A39D" }}>
                {allowances.find((a) => a.id === editingAllowanceId)?.childName ?? ""}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setEditingAllowanceId(null)}><Text style={{ color: "#8E8880" }}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14, paddingBottom: 28 }}>
              <View>
                <Text style={{ marginBottom: 8, fontSize: 11, fontWeight: "700", color: "#A7A39D", letterSpacing: 1.4 }}>NUEVA MESADA SEMANAL</Text>
                <TextInput
                  value={editAllowanceAmount}
                  onChangeText={setEditAllowanceAmount}
                  keyboardType="numeric"
                  autoFocus
                  style={{ borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, color: "#101111", fontSize: 20, fontWeight: "800", textAlign: "center" }}
                  placeholder="0"
                  placeholderTextColor="#B8B2AA"
                />
              </View>
              <TouchableOpacity onPress={handleSaveEditAllowance} disabled={!editAllowanceAmount || Number(editAllowanceAmount) <= 0} activeOpacity={0.85} style={{ borderRadius: 999, backgroundColor: "#0D7655", paddingVertical: 16, alignItems: "center", opacity: !editAllowanceAmount || Number(editAllowanceAmount) <= 0 ? 0.6 : 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Guardar cambios</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Picker de miembros para mesada */}
      <MemberPickerSheet
        visible={allowanceMemberPickerOpen}
        members={members}
        selected={allowanceDraft.childName}
        onSelect={(name) => setAllowanceDraft((c) => ({ ...c, childName: name }))}
        onClose={() => setAllowanceMemberPickerOpen(false)}
        title="Asignar mesada a"
      />
    </View>
  );
}

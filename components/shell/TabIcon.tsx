import React from "react";
import { Image, View } from "react-native";
import Svg, { Path, Rect, Circle, Line, Polyline } from "react-native-svg";
import { SvgCssUri } from "react-native-svg/css";

type TabIconId = "home" | "tasks" | "finances" | "employee" | "menus" | "savings" | "evidence" | "profile";

function TabIconHome({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TabIconTasks({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={3} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TabIconFinances({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TabIconEmployee({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TabIconMenus({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={6} y1={1} x2={6} y2={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={10} y1={1} x2={10} y2={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={14} y1={1} x2={14} y2={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function TabIconSavings({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={2} y1={9} x2={5} y2={9} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function TabIconEvidence({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TabIconProfile({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const SVG_ICONS: Partial<Record<TabIconId, number>> = {
  home: require("@/assets/icons/hogar.svg"),
  tasks: require("@/assets/icons/tareas.svg"),
  finances: require("@/assets/icons/finanzas.svg"),
  employee: require("@/assets/icons/asistente.svg"),
  menus: require("@/assets/icons/menus.svg"),
  savings: require("@/assets/icons/Mesadas_1.svg"),
};

const FALLBACK_ICONS: Partial<Record<TabIconId, React.FC<{ color: string }>>> = {
  evidence: TabIconEvidence,
  profile: TabIconProfile,
};

export function TabIcon({ id, color, active = false }: { id: TabIconId; color: string; active?: boolean }) {
  const svgAssetId = SVG_ICONS[id];
  if (svgAssetId) {
    const svgUri = Image.resolveAssetSource(svgAssetId)?.uri;
    return (
      <View
        style={{
          width: 24,
          height: 24,
          opacity: active ? 1 : 0.48,
          transform: [{ scale: active ? 1 : 0.94 }],
        }}
      >
        {svgUri ? <SvgCssUri uri={svgUri} width="100%" height="100%" /> : null}
      </View>
    );
  }

  const FallbackIcon = FALLBACK_ICONS[id];
  return FallbackIcon ? <FallbackIcon color={color} /> : null;
}

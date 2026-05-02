import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { AppHeader } from "@/components/shell/AppHeader";
import { apiFetch } from "@/lib/api/client";
import { useSession } from "@/lib/contexts/session-context";
import { useAvatar, AVATAR_NOMA, AVATAR_COUNT } from "@/lib/contexts/avatar-context";
import { roleMeta, roleOptions, type AppRoleKey } from "@/lib/access-control";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";
import type { ProfileModuleData } from "@/lib/types";

const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  return code;
}

const INVITE_ROLE_LABELS: Record<AppRoleKey, string> = {
  OWNER: "Segundo administrador",
  MEMBER: "Miembro del hogar",
  DOMESTIC_HELP: "Empleada doméstica",
};

type LocalInvite = { id: string; code: string; roleKey: AppRoleKey; status: "PENDING" | "ACCEPTED" };

function getInitials(name: string) {
  const p = name.trim().split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

// ── Small reusable bits ──────────────────────────────────────────────────────

function SectionLabel({ children, color = "#0D7655" }: { children: string; color?: string }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase", color }}>
      {children}
    </Text>
  );
}

function OrangeUnderline() {
  return <View style={{ marginTop: 8, height: 2, width: 32, borderRadius: 2, backgroundColor: "#FF6A00" }} />;
}

function IconRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "white", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D9ECE5", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        {!!label && <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#A3A3A3", marginBottom: 3 }}>{label}</Text>}
        {children}
      </View>
    </View>
  );
}

function RolePickerModal({ visible, selected, onSelect, onClose }: {
  visible: boolean;
  selected: AppRoleKey;
  onSelect: (r: AppRoleKey) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Seleccionar rol</Text>
          <TouchableOpacity onPress={onClose} style={{ borderRadius: 999, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
        {roleOptions.map((r) => {
          const active = selected === r;
          return (
            <TouchableOpacity
              key={r}
              activeOpacity={0.85}
              onPress={() => { onSelect(r); onClose(); }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 8, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: active ? "#D8EEE5" : "white", borderWidth: active ? 1.5 : 0, borderColor: "#0D7655" }}
            >
              <View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: active ? "#0D7655" : "#101111" }}>{INVITE_ROLE_LABELS[r]}</Text>
                {r === "OWNER" && (
                  <Text style={{ fontSize: 11, color: "#A3A3A3", marginTop: 2 }}>Acceso completo al hogar</Text>
                )}
              </View>
              {active && (
                <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <Path d="M3 9l4 4 8-8" stroke="#0D7655" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

function DayPickerModal({ visible, selected, onSelect, onClose }: {
  visible: boolean;
  selected: string;
  onSelect: (d: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Día del resumen</Text>
          <TouchableOpacity onPress={onClose} style={{ borderRadius: 999, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
        {DAYS.map((d) => {
          const active = selected === d;
          return (
            <TouchableOpacity
              key={d}
              activeOpacity={0.85}
              onPress={() => { onSelect(d); onClose(); }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 8, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: active ? "#D8EEE5" : "white", borderWidth: active ? 1.5 : 0, borderColor: "#0D7655" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: active ? "#0D7655" : "#101111" }}>{d}</Text>
              {active && (
                <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <Path d="M3 9l4 4 8-8" stroke="#0D7655" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { session, logout, updateSession } = useSession();
  const { selectedAvatar, setSelectedAvatar } = useAvatar();
  const { preselectRole } = useLocalSearchParams<{ preselectRole?: string }>();

  const [data, setData] = useState<ProfileModuleData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals / UI
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMemberRolePicker, setShowMemberRolePicker] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Drafts
  const [editDraft, setEditDraft] = useState({ ownerName: "", householdName: "", city: "", country: "" });
  const [inviteRoleKey, setInviteRoleKey] = useState<AppRoleKey>("MEMBER");
  const [activeInvite, setActiveInvite] = useState<LocalInvite | null>(null);
  const [localInvites, setLocalInvites] = useState<LocalInvite[]>([]);
  const [empDraft, setEmpDraft] = useState({ name: "", schedule: "", workDays: "", salary: "", startDate: "" });
  const [prefDraft, setPrefDraft] = useState({ weeklyDigestDay: "Viernes", weeklyDigestTime: "6:30 pm", paymentAlerts: true, evidenceAlerts: true, dailySummary: true });

  // Saving
  const [saving, setSaving] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [savingEmp, setSavingEmp] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [empSaved, setEmpSaved] = useState(false);

  // Section scroll
  const scrollRef = useRef<ScrollView>(null);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});

  function scrollToSection(key: string) {
    if (sectionY[key] !== undefined) {
      scrollRef.current?.scrollTo({ y: sectionY[key] - 8, animated: true });
    }
  }

  const viewerInitials = useMemo(() =>
    (session?.name ?? "").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(""),
    [session?.name]
  );

  const domesticMember = useMemo(
    () => data?.members.find((m) => m.roleKey === "DOMESTIC_HELP") ?? null,
    [data?.members]
  );

  function loadData() {
    if (!session) return;
    setLoading(true);
    apiFetch<ProfileModuleData>("/api/profile", { token: session.token })
      .then((d) => {
        setData(d);
        setEditDraft({ ownerName: d.household.ownerName, householdName: d.household.name, city: d.household.city, country: d.household.country });
        setPrefDraft({
          weeklyDigestDay: d.preferences.weeklyDigestDay,
          weeklyDigestTime: d.preferences.weeklyDigestTime,
          paymentAlerts: d.preferences.paymentAlerts,
          evidenceAlerts: d.preferences.evidenceAlerts,
          dailySummary: d.preferences.dailySummary,
        });
        setEmpDraft((c) => ({ ...c, name: d.members.find((m) => m.roleKey === "DOMESTIC_HELP")?.name ?? "" }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useFocusEffect(useCallback(() => { loadData(); }, [session?.token]));

  useFocusEffect(useCallback(() => {
    if (preselectRole === "DOMESTIC_HELP") {
      setInviteRoleKey("DOMESTIC_HELP");
      setTimeout(() => scrollToSection("gestiona"), 400);
    }
  }, [preselectRole]));

  async function handleSaveProfile() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: ProfileModuleData }>("/api/profile", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({ type: "household", payload: { householdName: editDraft.householdName, ownerName: editDraft.ownerName, city: editDraft.city, country: editDraft.country } }),
      });
      if (res?.data) setData(res.data);
      await updateSession({ name: editDraft.ownerName, householdName: editDraft.householdName });
      setShowEditProfile(false);
    } catch { /* silent */ }
    setSaving(false);
  }

  function handleGenerateCode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const invite: LocalInvite = {
      id: Date.now().toString(),
      code: generateInviteCode(),
      roleKey: inviteRoleKey,
      status: "PENDING",
    };
    setActiveInvite(invite);
    setLocalInvites((c) => [invite, ...c]);
    setShowInviteCodeModal(true);
  }

  async function handleCopyCode(code: string) {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  function handleWhatsAppShare(code: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const msg = encodeURIComponent(
      `Te invito a unirte a nuestro hogar en Noma. Descarga la app y usa el código: ${code}. Tienes 48 horas para usarlo.`
    );
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => Linking.openURL(`https://wa.me/?text=${msg}`));
  }

  async function handleSaveEmployee() {
    if (!domesticMember) return;
    setSavingEmp(true);
    setEmpSaved(false);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({ type: "employee_profile", payload: { memberId: domesticMember.id, ...empDraft } }),
      });
      if (empDraft.name.trim()) {
        setData((c) => c ? {
          ...c,
          members: c.members.map((m) => m.id === domesticMember.id
            ? { ...m, name: empDraft.name, initials: empDraft.name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") }
            : m)
        } : c);
      }
      setEmpSaved(true);
    } catch { /* silent */ }
    setSavingEmp(false);
  }

  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        token: session?.token,
        body: JSON.stringify({
          type: "household",
          payload: { weeklyDigestDay: prefDraft.weeklyDigestDay, weeklyDigestTime: prefDraft.weeklyDigestTime, paymentAlerts: prefDraft.paymentAlerts, evidenceAlerts: prefDraft.evidenceAlerts, dailySummary: prefDraft.dailySummary },
        }),
      });
      setData((c) => c ? { ...c, preferences: prefDraft } : c);
    } catch { /* silent */ }
    setSavingPrefs(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0EA", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0D7655" />
      </View>
    );
  }

  const household = data?.household;
  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
      <AppHeader viewerInitials={viewerInitials} />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero card ─────────────────────────────────────── */}
        <View style={{ margin: 16, borderRadius: 28, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
          <View style={{ padding: 20, paddingBottom: 16 }}>
            <SectionLabel>Perfil y administración del hogar</SectionLabel>
            <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "800", color: "#101111", lineHeight: 26 }}>
              {"Centro de perfil de "}
              <Text style={{ color: "#0D7655" }}>{household?.ownerName ?? session?.name}</Text>
            </Text>
            <OrangeUnderline />
            <Text style={{ marginTop: 12, fontSize: 13, color: "#737373", lineHeight: 19 }}>
              Desde aquí personalizas tu cuenta, ajustas cómo Noma te avisa y gestionas los miembros del hogar con sus roles.
            </Text>
            <TouchableOpacity
              onPress={() => setShowEditProfile(true)}
              activeOpacity={0.8}
              style={{ alignSelf: "flex-start", marginTop: 14, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, borderWidth: 1.5, borderColor: "#FF6A00", paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#FF6A00" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#FF6A00" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#FF6A00" }}>Editar perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Dark green active profile card */}
          <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, backgroundColor: "#0D3D2B", padding: 16, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#FF6A00" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#FF6A00" }}>Perfil activo</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={() => setShowAvatarPicker(true)} activeOpacity={0.8} style={{ position: "relative" }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }}>
                  {selectedAvatar ? (
                    <Image source={AVATAR_NOMA[selectedAvatar]!} style={{ width: 60, height: 60 }} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 20, fontWeight: "700", color: "white" }}>{viewerInitials}</Text>
                  )}
                </View>
                <View style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#FF6A00", alignItems: "center", justifyContent: "center" }}>
                  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={12} cy={13} r={4} stroke="white" strokeWidth={2.2} />
                  </Svg>
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "white" }}>{household?.ownerName ?? session?.name}</Text>
                <Text style={{ marginTop: 3, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{household?.ownerRole ?? "Administradora principal"}</Text>
                <Text style={{ marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Toca el avatar para cambiarlo</Text>
              </View>
            </View>

            <View style={{ marginVertical: 14, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => scrollToSection("gestiona")} style={{ flex: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#FF6A00" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={9} cy={7} r={4} stroke="#FF6A00" strokeWidth={2} />
                    <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#FF6A00" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Miembros</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "white" }}>{members.length}</Text>
                <Text style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ver todos ›</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowEditProfile(true)} style={{ flex: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#FF6A00" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={12} cy={10} r={3} stroke="#FF6A00" strokeWidth={2} />
                  </Svg>
                  <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Ciudad</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "white" }} numberOfLines={1}>{household?.city || "—"}</Text>
                <Text style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Cambiar ›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4 nav tiles */}
          <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
            {[
              {
                label: "Gestiona\nroles", key: "gestiona",
                icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={8} r={4} stroke="#0D7655" strokeWidth={1.8} /><Path d="M6 20v-2a6 6 0 0 1 12 0v2" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>,
              },
              {
                label: "Notifi-\ncaciones", key: "prefs", dot: true,
                icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>,
              },
              {
                label: "Seguridad\ny privacidad", key: "edit",
                icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>,
              },
              {
                label: "Actividad\ndel hogar", key: "plan",
                icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M18 20V10M12 20V4M6 20v-6" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>,
              },
            ].map(({ label, key, icon, dot }, i) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                onPress={() => {
                  if (key === "edit") { setShowEditProfile(true); return; }
                  scrollToSection(key);
                }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 14, gap: 6, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: "rgba(0,0,0,0.05)" }}
              >
                <View style={{ position: "relative", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(13,118,85,0.1)", alignItems: "center", justifyContent: "center" }}>
                  {icon}
                  {dot && <View style={{ position: "absolute", top: -1, right: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6A00", borderWidth: 2, borderColor: "white" }} />}
                </View>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#737373", textAlign: "center", lineHeight: 13 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 2. Gestión del hogar ─────────────────────────────── */}
        <View
          onLayout={(e) => { const y = e.nativeEvent.layout.y; setSectionY((o) => ({ ...o, gestiona: y })); }}
          style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 28, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}
        >
          <View style={{ padding: 20, paddingBottom: 16 }}>
            <SectionLabel>Miembros y roles</SectionLabel>
            <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "800", color: "#101111" }}>
              {"Gestion "}
              <Text style={{ color: "#0D7655" }}>del hogar</Text>
            </Text>
            <OrangeUnderline />
            <Text style={{ marginTop: 12, fontSize: 13, color: "#737373", lineHeight: 19 }}>
              Aquí defines quiénes hacen parte de la casa y con qué rol entran.
            </Text>
          </View>

          {/* Add member form */}
          <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, backgroundColor: "#FFF4EA", padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FF6A00", alignItems: "center", justifyContent: "center" }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 5v14M5 12h14" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
                </Svg>
              </View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase", color: "#FF6A00" }}>Agregar miembro</Text>
            </View>

            <Text style={{ fontSize: 11, color: "#A3A3A3", marginBottom: 12, lineHeight: 16 }}>
              Elige el rol y comparte el código. La persona lo usa al instalar Noma.
            </Text>

            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowMemberRolePicker(true)}>
              <IconRow label="" icon={<Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#101111" }}>{INVITE_ROLE_LABELS[inviteRoleKey]}</Text>
                  <Text style={{ fontSize: 14, color: "#A3A3A3" }}>⇅</Text>
                </View>
              </IconRow>
            </TouchableOpacity>

            {inviteRoleKey === "OWNER" && (
              <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: "#E8F5F0", padding: 12, borderWidth: 1, borderColor: "#C5DDCF" }}>
                <Text style={{ fontSize: 12, color: "#0D7655", fontWeight: "500", lineHeight: 18 }}>
                  Esta persona tendrá acceso completo al hogar. Solo invita a alguien de total confianza.
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGenerateCode}
              style={{ marginTop: 14, borderRadius: 999, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF6A00", shadowColor: "#FF6A00", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx={9} cy={7} r={4} stroke="white" strokeWidth={2.2} />
                <Path d="M19 8v6M22 11h-6" stroke="white" strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Generar código de invitación</Text>
            </TouchableOpacity>
          </View>

          {/* Members list */}
          <View style={{ borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M9 22V12h6v10" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <SectionLabel>Miembros del hogar</SectionLabel>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: "rgba(13,118,85,0.1)", paddingHorizontal: 10, paddingVertical: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF6A00" }} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D7655" }}>{members.length + localInvites.length} miembros</Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              {members.map((m) => {
                const initials = m.initials || getInitials(m.name);
                return (
                  <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#F9F6F2", paddingHorizontal: 14, paddingVertical: 13 }}>
                    <View style={{ position: "relative" }}>
                      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#D9ECE5", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#0D7655" }}>{initials}</Text>
                      </View>
                      <View style={{ position: "absolute", bottom: -1, left: "50%", marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6A00", borderWidth: 2, borderColor: "white" }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111" }}>{m.name}</Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: "#A3A3A3" }}>{m.roleKey ? roleMeta[m.roleKey]?.label : m.role}</Text>
                    </View>
                    <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
                      <Path d="M1 1l5 5-5 5" stroke="#C0C0C0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                );
              })}
              {members.length === 0 && localInvites.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ fontSize: 13, color: "#A3A3A3" }}>Sin miembros registrados</Text>
                </View>
              )}

              {/* Pending / accepted invitations */}
              {localInvites.map((inv) => (
                <View key={inv.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: inv.status === "ACCEPTED" ? "#F0FBF6" : "#FFF8F3", paddingHorizontal: 14, paddingVertical: 13 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: inv.status === "ACCEPTED" ? "#D9ECE5" : "#FFE8D6", alignItems: "center", justifyContent: "center" }}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      {inv.status === "ACCEPTED" ? (
                        <>
                          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                          <Circle cx={12} cy={7} r={4} stroke="#0D7655" strokeWidth={1.8} />
                        </>
                      ) : (
                        <>
                          <Rect x={9} y={9} width={13} height={13} rx={2} stroke="#FF6A00" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                          <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#FF6A00" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </Svg>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111" }}>
                        {INVITE_ROLE_LABELS[inv.roleKey]}
                      </Text>
                      <View style={{
                        borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
                        backgroundColor: inv.status === "ACCEPTED" ? "rgba(13,118,85,0.1)" : "rgba(255,106,0,0.1)",
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: inv.status === "ACCEPTED" ? "#0D7655" : "#FF6A00" }}>
                          {inv.status === "ACCEPTED" ? "Unido/a" : "Pendiente"}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ marginTop: 3, fontSize: 12, fontWeight: "700", color: "#A3A3A3", letterSpacing: 2 }}>
                      {inv.code}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setActiveInvite(inv); setShowInviteCodeModal(true); }}
                    activeOpacity={0.7}
                    style={{ padding: 6 }}
                  >
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#C0C0C0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                      <Circle cx={12} cy={12} r={3} stroke="#C0C0C0" strokeWidth={1.6} />
                    </Svg>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── 3. Perfil del asistente (if exists) ──────────────── */}
        {domesticMember && (
          <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 28, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
            <View style={{ padding: 20, paddingBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <View style={{ position: "relative" }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#0D7655", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "white" }}>{domesticMember.initials}</Text>
                  </View>
                  <View style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FF6A00", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <SectionLabel>Asistente del hogar</SectionLabel>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#101111" }}>
                      {"Perfil de "}
                      <Text style={{ color: "#0D7655" }}>{domesticMember.name.split(" ")[0]}</Text>
                    </Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#0D7655" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#0D7655" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 11, color: "#A3A3A3", lineHeight: 15 }}>Edita los datos cuando haya cambios de horario, días o condiciones.</Text>
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, gap: 10 }}>
              {[
                { label: "NOMBRE COMPLETO", key: "name" as const, placeholder: domesticMember.name, icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={12} cy={7} r={4} stroke="#0D7655" strokeWidth={1.8} /></Svg> },
                { label: "HORARIO (EJ. LUN–VIE 7AM–4PM)", key: "schedule" as const, placeholder: "Lun–Vie 7am–4pm", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={10} stroke="#0D7655" strokeWidth={1.8} /><Path d="M12 6v6l4 2" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg> },
                { label: "DÍAS DE TRABAJO", key: "workDays" as const, placeholder: "Lunes a viernes", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M3 4h18v18H3z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Path d="M16 2v4M8 2v4M3 10h18" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" /></Svg> },
                { label: "SALARIO / PAGO MENSUAL", key: "salary" as const, placeholder: "$1,300,000", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M2 5h20v14H2z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Path d="M2 10h20" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" /></Svg> },
                { label: "FECHA DE INICIO", key: "startDate" as const, placeholder: "YYYY-MM-DD", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M3 4h18v18H3z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Path d="M16 2v4M8 2v4M3 10h18" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" /></Svg> },
              ].map(({ label, key, placeholder, icon }) => (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", paddingHorizontal: 14, paddingVertical: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D9ECE5", alignItems: "center", justifyContent: "center" }}>
                    {icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#A3A3A3", marginBottom: 4 }}>{label}</Text>
                    <TextInput
                      value={empDraft[key]}
                      onChangeText={(v) => setEmpDraft((c) => ({ ...c, [key]: v }))}
                      placeholder={placeholder}
                      placeholderTextColor="#C8C8C8"
                      style={{ fontSize: 13, fontWeight: "500", color: key === "salary" ? "#FF6A00" : "#101111" }}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveEmployee}
                disabled={savingEmp}
                style={{ borderRadius: 999, paddingVertical: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FF6A00", marginTop: 4, shadowColor: "#FF6A00", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                      <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                  {savingEmp ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Guardar cambios</Text>}
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 18l6-6-6-6" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              {empSaved && <Text style={{ textAlign: "center", fontSize: 12, fontWeight: "600", color: "#0D7655" }}>Cambios guardados ✓</Text>}
            </View>
          </View>
        )}

        {/* ── 4. Preferencias ──────────────────────────────────── */}
        <View
          onLayout={(e) => { const y = e.nativeEvent.layout.y; setSectionY((o) => ({ ...o, prefs: y })); }}
          style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 28, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}
        >
          <View style={{ padding: 20, paddingBottom: 16 }}>
            <SectionLabel color="#FF6A00">Preferencias</SectionLabel>
            <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "800", color: "#101111", lineHeight: 26 }}>
              {"Cómo quieres que "}
              <Text style={{ color: "#0D7655" }}>Noma</Text>
              {" te avise"}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 8 }}>
            {/* Day picker */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowDayPicker(true)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", paddingHorizontal: 14, paddingVertical: 13 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D9ECE5", alignItems: "center", justifyContent: "center" }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M3 4h18v18H3z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#A3A3A3", marginBottom: 3 }}>Día del resumen semanal</Text>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#101111" }}>{prefDraft.weeklyDigestDay}</Text>
                </View>
                <Text style={{ fontSize: 14, color: "#A3A3A3" }}>⇅</Text>
              </View>
            </TouchableOpacity>

            {/* Time */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", paddingHorizontal: 14, paddingVertical: 13 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D9ECE5", alignItems: "center", justifyContent: "center" }}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke="#0D7655" strokeWidth={1.8} />
                  <Path d="M12 6v6l4 2" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#A3A3A3", marginBottom: 3 }}>Hora del resumen</Text>
                <TextInput
                  value={prefDraft.weeklyDigestTime}
                  onChangeText={(weeklyDigestTime) => setPrefDraft((c) => ({ ...c, weeklyDigestTime }))}
                  placeholder="6:30 pm"
                  placeholderTextColor="#C0C0C0"
                  style={{ fontSize: 13, fontWeight: "500", color: "#101111" }}
                />
              </View>
            </View>
          </View>

          {/* Toggles */}
          <View style={{ marginTop: 8, paddingHorizontal: 20, gap: 2 }}>
            {[
              { key: "paymentAlerts" as const, label: "Alertas de pagos y vencimientos", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={10} stroke="#0D7655" strokeWidth={1.8} /><Path d="M12 8v4M12 16h.01" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" /></Svg> },
              { key: "evidenceAlerts" as const, label: "Avisos de evidencias y fotos", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={12} cy={13} r={4} stroke="#0D7655" strokeWidth={1.8} /></Svg> },
              { key: "dailySummary" as const, label: "Resumen diario del hogar", icon: <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#0D7655" strokeWidth={1.8} strokeLinecap="round" /></Svg> },
            ].map(({ key, label, icon }) => (
              <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", paddingHorizontal: 14, paddingVertical: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D9ECE5", alignItems: "center", justifyContent: "center" }}>
                  {icon}
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: "#101111" }}>{label}</Text>
                <Switch
                  value={prefDraft[key]}
                  onValueChange={(v) => setPrefDraft((c) => ({ ...c, [key]: v }))}
                  trackColor={{ false: "#E0E0E0", true: "#FF6A00" }}
                  thumbColor="white"
                  ios_backgroundColor="#E0E0E0"
                />
              </View>
            ))}
          </View>

          <View style={{ padding: 20, paddingTop: 14 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSavePreferences}
              disabled={savingPrefs}
              style={{ borderRadius: 999, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF6A00", shadowColor: "#FF6A00", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              {savingPrefs ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Guardar preferencias</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 6. Plan y renovación ─────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 28, backgroundColor: "white", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
          <View style={{ padding: 20, paddingBottom: 12 }}>
            <SectionLabel>Suscripción</SectionLabel>
            <Text style={{ marginTop: 8, fontSize: 18, fontWeight: "800", color: "#101111" }}>Plan y renovación</Text>
          </View>

          {/* Plan card */}
          <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, backgroundColor: "#0D3D2B", padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Plan activo</Text>
                <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "800", color: "white" }}>Plan Hogar</Text>
              </View>
              <View style={{ borderRadius: 999, backgroundColor: "rgba(255,106,0,0.2)", paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FF6A00" }}>Activo</Text>
              </View>
            </View>
            <View style={{ marginVertical: 12, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}>
                <Text style={{ fontSize: 9, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Próxima renovación</Text>
                <Text style={{ marginTop: 6, fontSize: 13, fontWeight: "700", color: "white" }}>24 May 2026</Text>
                <Text style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>en 30 días</Text>
              </View>
              <View style={{ flex: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}>
                <Text style={{ fontSize: 9, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Costo mensual</Text>
                <Text style={{ marginTop: 6, fontSize: 13, fontWeight: "700", color: "white" }}>$29.900</Text>
                <Text style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>COP / mes</Text>
              </View>
            </View>
          </View>

          {/* Features */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#A3A3A3", marginBottom: 10 }}>Incluido en tu plan</Text>
            <View style={{ gap: 10 }}>
              {["Gestión de miembros ilimitados", "Control financiero completo", "Asistente del hogar", "Menús semanales con IA", "Invitaciones y accesos"].map((f) => (
                <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#0D7655", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                      <Path d="M2 5l2 2 4-4" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                  <Text style={{ fontSize: 13, color: "#4A4A4A" }}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cancel */}
          <View style={{ padding: 20, paddingTop: 16 }}>
            {!cancelConfirm ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCancelConfirm(true)}
                style={{ borderRadius: 999, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#FECACA" }}
              >
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke="#F87171" strokeWidth={2} />
                  <Path d="M15 9l-6 6M9 9l6 6" stroke="#F87171" strokeWidth={2} strokeLinecap="round" />
                </Svg>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#F87171" }}>Cancelar suscripción</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ borderRadius: 18, borderWidth: 1, borderColor: "#FEE2E2", backgroundColor: "#FFF5F5", padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#101111", textAlign: "center" }}>¿Seguro que quieres cancelar?</Text>
                <Text style={{ fontSize: 11, color: "#737373", textAlign: "center" }}>Perderás acceso a todas las funciones al finalizar el periodo el 24 May 2026.</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity onPress={() => setCancelConfirm(false)} activeOpacity={0.8} style={{ flex: 1, borderRadius: 999, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "white", paddingVertical: 11, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#4A4A4A" }}>Mantener plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCancelConfirm(false)} activeOpacity={0.8} style={{ flex: 1, borderRadius: 999, backgroundColor: "#EF4444", paddingVertical: 11, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "white" }}>Sí, cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Dev role switcher (solo __DEV__) ─────────────────── */}
        <DevRoleSwitcher />

        {/* ── Logout ───────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); logout(); }}
          activeOpacity={0.7}
          style={{ alignItems: "center", paddingVertical: 16, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#A3A3A3" }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit profile modal ───────────────────────────────── */}
      <Modal visible={showEditProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditProfile(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0F5C4A" }}>Seguridad</Text>
              <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "800", color: "#101111" }}>Editar perfil</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEditProfile(false)} style={{ borderRadius: 999, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 10, paddingBottom: 40 }}>
              {[
                { label: "Tu nombre", key: "ownerName" as const, placeholder: "Tu nombre" },
                { label: "Nombre del hogar", key: "householdName" as const, placeholder: "Ej. Casa Rodríguez" },
                { label: "Ciudad", key: "city" as const, placeholder: "Bogotá" },
                { label: "País", key: "country" as const, placeholder: "Colombia" },
              ].map(({ label, key, placeholder }) => (
                <View key={key} style={{ borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 13 }}>
                  <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#A3A3A3", marginBottom: 5 }}>{label}</Text>
                  <TextInput
                    value={editDraft[key]}
                    onChangeText={(v) => setEditDraft((c) => ({ ...c, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor="#C0C0C0"
                    style={{ fontSize: 13, fontWeight: "500", color: "#101111" }}
                  />
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveProfile}
                disabled={saving}
                style={{ borderRadius: 999, paddingVertical: 15, alignItems: "center", backgroundColor: "#FF6A00", marginTop: 8, opacity: saving ? 0.6 : 1, shadowColor: "#FF6A00", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 13, fontWeight: "800", color: "white" }}>Guardar perfil</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Avatar picker modal ──────────────────────────────── */}
      <Modal visible={showAvatarPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAvatarPicker(false)}>
        <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase", color: "#0F5C4A" }}>Tu avatar</Text>
              <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "800", color: "#101111" }}>Elige tu personaje</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAvatarPicker(false)} style={{ borderRadius: 999, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Listo</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => {
                const selected = selectedAvatar === n;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => { setSelectedAvatar(n); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                    style={{ width: 82, height: 82, borderRadius: 18, overflow: "hidden", borderWidth: selected ? 2.5 : 0, borderColor: selected ? "#0D7655" : "transparent", backgroundColor: "#EDE8E2", alignItems: "center", justifyContent: "center" }}
                  >
                    <Image source={AVATAR_NOMA[n]!} style={{ width: 72, height: 72 }} resizeMode="contain" />
                    {selected && (
                      <View style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#0D7655", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Role picker ──────────────────────────────────────── */}
      <RolePickerModal
        visible={showMemberRolePicker}
        selected={inviteRoleKey}
        onSelect={(r) => setInviteRoleKey(r)}
        onClose={() => setShowMemberRolePicker(false)}
      />

      {/* ── Invite code modal ────────────────────────────────── */}
      <Modal
        visible={showInviteCodeModal && !!activeInvite}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteCodeModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#F5F0EA" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#101111" }}>Código de invitación</Text>
            <TouchableOpacity onPress={() => setShowInviteCodeModal(false)} style={{ borderRadius: 999, backgroundColor: "#EDE8E2", paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B6B6B" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {activeInvite && (
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
              {/* Role badge */}
              <View style={{ alignSelf: "center", borderRadius: 999, backgroundColor: "rgba(13,118,85,0.1)", paddingHorizontal: 14, paddingVertical: 6, marginBottom: 24 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0D7655", letterSpacing: 0.5 }}>
                  {INVITE_ROLE_LABELS[activeInvite.roleKey].toUpperCase()}
                </Text>
              </View>

              {/* Code box */}
              <View style={{ borderRadius: 20, borderWidth: 2, borderColor: "#0D7655", borderStyle: "dashed", padding: 28, alignItems: "center", backgroundColor: "white", marginBottom: 12, position: "relative" }}>
                <Text style={{ fontSize: 44, fontWeight: "800", color: "#0D7655", letterSpacing: 10 }}>
                  {activeInvite.code}
                </Text>
                <TouchableOpacity
                  onPress={() => handleCopyCode(activeInvite.code)}
                  activeOpacity={0.7}
                  style={{ position: "absolute", bottom: 10, right: 12, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: codeCopied ? "#E8F5F0" : "#F5F0EB" }}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Rect x={9} y={9} width={13} height={13} rx={2} stroke="#0D7655" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#0D7655" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D7655" }}>
                    {codeCopied ? "¡Copiado!" : "Copiar"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: "#9A9A9A", textAlign: "center", lineHeight: 18, marginBottom: 32 }}>
                Compártelo con la persona que quieres invitar.{"\n"}Tiene 48 horas para usarlo.
              </Text>

              {/* WhatsApp */}
              <TouchableOpacity
                onPress={() => handleWhatsAppShare(activeInvite.code)}
                activeOpacity={0.88}
                style={{ borderRadius: 18, paddingVertical: 16, backgroundColor: "#25D366", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 12, shadowColor: "#25D366", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>Compartir por WhatsApp</Text>
              </TouchableOpacity>

              {/* Done */}
              <TouchableOpacity
                onPress={() => setShowInviteCodeModal(false)}
                activeOpacity={0.7}
                style={{ borderRadius: 18, paddingVertical: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#D5CFC8" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#5C5C5C" }}>Listo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <DayPickerModal
        visible={showDayPicker}
        selected={prefDraft.weeklyDigestDay}
        onSelect={(d) => setPrefDraft((c) => ({ ...c, weeklyDigestDay: d }))}
        onClose={() => setShowDayPicker(false)}
      />
    </View>
  );
}

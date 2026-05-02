import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { NomaLogo } from "@/lib/components/noma-logo";

type InviteRole = "OWNER" | "MEMBER" | "DOMESTIC_HELP" | null;

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MemberIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} />
    </Svg>
  );
}

function AdminIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DomesticIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3h18" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6 3l-3 18" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M18 3l3 18" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M5 12h14" stroke={active ? "#1B4D3E" : "#9A9A9A"} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CheckCircle() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#1B4D3E" />
      <Path d="M8 12l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EmptyCircle() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#D5CFC8" strokeWidth={1.8} />
    </Svg>
  );
}

function RoleCard({
  role, label, icon, selected, onPress, index,
}: {
  role: InviteRole;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {

    return (
    <Animated.View entering={FadeIn.duration(300)}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
            borderRadius: 18,
            paddingHorizontal: 20,
            paddingVertical: 18,
            borderWidth: 2,
            borderColor: selected ? "#1B4D3E" : "#E8E3DC",
            gap: 14,
          }}
        >
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: selected ? "#E8F5F0" : "#F5F0EB",
            justifyContent: "center", alignItems: "center",
          }}>
            {icon}
          </View>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: selected ? "#1B4D3E" : "#1A1A1A" }}>
            {label}
          </Text>
          {selected ? <CheckCircle /> : <EmptyCircle />}
        </TouchableOpacity>
      </Animated.View>
  );
}

export default function InviteWhoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<InviteRole>(null);
  const [canSeeFinances, setCanSeeFinances] = useState(false);

  function handleSelect(role: InviteRole) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
    if (role !== "MEMBER") setCanSeeFinances(false);
  }

  function handleGenerate() {
    if (!selectedRole) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/onboarding/invite-code",
      params: { role: selectedRole, canSeeFinances: canSeeFinances ? "1" : "0" },
    });
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: "#F5F0EB",
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 32,
      paddingHorizontal: 24,
    }}>
      {/* Back + Logo */}
      <Animated.View
        entering={FadeIn.duration(300).delay(80)}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 40 }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 16 }}>
          <BackIcon />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
          <NomaLogo />
        </View>
      </Animated.View>

      {/* Headline */}
      <Animated.Text
        entering={FadeIn.duration(300).delay(160)}
        style={{
          fontSize: 34,
          fontWeight: "800",
          color: "#1B4D3E",
          letterSpacing: -0.8,
          lineHeight: 40,
          marginBottom: 32,
        }}
      >
        ¿A quién vas{"\n"}a invitar?
      </Animated.Text>

      {/* Role cards */}
      <View style={{ gap: 12, marginBottom: 28 }}>
        <RoleCard
          role="OWNER"
          label="Segundo administrador"
          icon={<AdminIcon active={selectedRole === "OWNER"} />}
          selected={selectedRole === "OWNER"}
          onPress={() => handleSelect("OWNER")}
          index={0}
        />
        <RoleCard
          role="MEMBER"
          label="Miembro del hogar"
          icon={<MemberIcon active={selectedRole === "MEMBER"} />}
          selected={selectedRole === "MEMBER"}
          onPress={() => handleSelect("MEMBER")}
          index={1}
        />
        <RoleCard
          role="DOMESTIC_HELP"
          label="Empleada doméstica"
          icon={<DomesticIcon active={selectedRole === "DOMESTIC_HELP"} />}
          selected={selectedRole === "DOMESTIC_HELP"}
          onPress={() => handleSelect("DOMESTIC_HELP")}
          index={2}
        />
      </View>

      {/* Admin note */}
      {selectedRole === "OWNER" && (
        <Animated.View
          entering={FadeIn.duration(300).delay(240)}
          style={{
            backgroundColor: "#E8F5F0",
            borderRadius: 14,
            padding: 14,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: "#C5DDCF",
          }}
        >
          <Text style={{ fontSize: 13, color: "#1B4D3E", lineHeight: 20, fontWeight: "500" }}>
            Esta persona tendrá acceso completo al hogar: tareas, finanzas, menús y configuración. Solo invita a alguien de total confianza.
          </Text>
        </Animated.View>
      )}

      {/* Finance toggle — only when MEMBER selected */}
      {selectedRole === "MEMBER" && (
        <Animated.View
          entering={FadeIn.duration(300).delay(320)}
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: "#E8E3DC",
            marginBottom: 28,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 14 }}>
            ¿Puede ver las finanzas del hogar?
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCanSeeFinances(true); }}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                backgroundColor: canSeeFinances ? "#1B4D3E" : "#F5F0EB",
                borderWidth: 1.5,
                borderColor: canSeeFinances ? "#1B4D3E" : "#E8E3DC",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 15, color: canSeeFinances ? "white" : "#9A9A9A" }}>
                Sí
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCanSeeFinances(false); }}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                backgroundColor: !canSeeFinances ? "#E8622A" : "#F5F0EB",
                borderWidth: 1.5,
                borderColor: !canSeeFinances ? "#E8622A" : "#E8E3DC",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 15, color: !canSeeFinances ? "white" : "#9A9A9A" }}>
                No
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: "#9A9A9A", marginTop: 12, lineHeight: 18 }}>
            Por defecto, esta persona no podrá ver las finanzas del hogar.
          </Text>
        </Animated.View>
      )}

      <View style={{ flex: 1 }} />

      {/* CTA */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={!selectedRole}
          activeOpacity={0.88}
          style={{
            borderRadius: 18,
            paddingVertical: 18,
            backgroundColor: selectedRole ? "#E8622A" : "#D5CFC8",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
            Generar código
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

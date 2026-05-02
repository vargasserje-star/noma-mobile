import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { useSession } from "@/lib/contexts/session-context";
import { NomaLogo } from "@/lib/components/noma-logo";

const HOUSEHOLD_TYPE_MAP: Record<string, string> = {
  FAMILY: "FAMILY",
  COUPLE: "COUPLE",
  ROOMMATES: "ROOMMATES",
  SOLO: "SINGLE_PARENT",
};

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={9} y={22} width={6} height={-7} />
      <Path d="M9 22V12h6v10" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function HouseholdNameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, set, reset } = useOnboarding();
  const { signup } = useSession();
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!householdName.trim()) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const householdType = HOUSEHOLD_TYPE_MAP[draft.householdType] ?? "FAMILY";

    try {
      await signup({
        name: draft.name,
        email: draft.email,
        password: draft.password,
        householdName: householdName.trim(),
        householdType,
        city: "Mi Ciudad",
        country: "Colombia",
        hasEmployee: draft.hasEmployee,
        role: "OWNER",
      });
      set({ householdName: householdName.trim() });
      router.push("/onboarding/invite");
    } catch (e: unknown) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Ocurrió un error. Intenta de nuevo.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}>
            {/* Back + Logo */}
            <Animated.View
              entering={FadeIn.duration(300)}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 48 }}
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
              entering={FadeIn.duration(300).delay(80)}
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: "#1B4D3E",
                letterSpacing: -1,
                lineHeight: 42,
                marginBottom: 10,
              }}
            >
              Ponle nombre{"\n"}a tu hogar
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.duration(300).delay(160)}
              style={{ fontSize: 15, color: "#7C7C7C", lineHeight: 22, marginBottom: 36 }}
            >
              Así lo van a ver todos los miembros cuando se unan.
            </Animated.Text>

            {/* Input */}
            <Animated.View entering={FadeIn.duration(300).delay(240)}>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 10 }}>
                Nombre del hogar
              </Text>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: "white",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: householdName ? "#1B4D3E" : "#E8E3DC",
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}>
                <HomeIcon active={!!householdName} />
                <TextInput
                  value={householdName}
                  onChangeText={(v) => { setHouseholdName(v); setError(null); }}
                  placeholder="Ej: Casa Martínez, Nuestro hogar..."
                  placeholderTextColor="#C4C0B8"
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={{ flex: 1, fontSize: 16, color: "#1A1A1A", fontWeight: "500" }}
                />
              </View>

              {error && (
                <View style={{
                  marginTop: 16, borderRadius: 14, padding: 14,
                  backgroundColor: "rgba(239,68,68,0.07)",
                  borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
                }}>
                  <Text style={{ fontSize: 13, color: "#DC2626", fontWeight: "500" }}>{error}</Text>
                </View>
              )}
            </Animated.View>

            <View style={{ flex: 1, minHeight: 40 }} />

            {/* CTA */}
            <Animated.View entering={FadeIn.duration(300).delay(320)}>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!householdName.trim() || loading}
                activeOpacity={0.88}
                style={{
                  borderRadius: 18,
                  paddingVertical: 18,
                  backgroundColor: householdName.trim() ? "#E8622A" : "#D5CFC8",
                  alignItems: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
                    Crear mi hogar
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

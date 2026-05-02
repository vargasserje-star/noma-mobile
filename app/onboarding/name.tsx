import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { NomaLogo } from "@/lib/components/noma-logo";

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function NameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, set } = useOnboarding();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isDomestic = draft.role === "DOMESTIC_HELP";
  const isMember = draft.role === "MEMBER";

  function getSubcopy() {
    if (isDomestic) return "Para que sepan quién completó cada tarea.";
    if (isMember) return "Así te van a ver los demás en el hogar.";
    return "Así sabemos cómo hablarte.";
  }

  function handleContinue() {
    if (!name.trim()) {
      setError("Ingresa tu nombre para continuar.");
      return;
    }
    set({ name: name.trim() });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/onboarding/create-account");
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 40 }}
          >
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 16 }}>
              <BackIcon />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
              <NomaLogo />
            </View>
          </Animated.View>

          {/* Content */}
          <View style={{ flex: 1, justifyContent: "center" }}>
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
              ¿Cómo{"\n"}te llamas?
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.duration(300).delay(160)}
              style={{ fontSize: 15, color: "#7C7C7C", marginBottom: 36 }}
            >
              {getSubcopy()}
            </Animated.Text>

            <Animated.View entering={FadeIn.duration(300).delay(240)}>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 10 }}>
                Tu nombre
              </Text>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: "white",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: name ? "#1B4D3E" : "#E8E3DC",
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}>
                <PersonIcon active={!!name} />
                <TextInput
                  value={name}
                  onChangeText={(v) => { setName(v); setError(null); }}
                  placeholder="Tu nombre"
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
          </View>

          {/* CTA */}
          <Animated.View entering={FadeIn.duration(300).delay(320)}>
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!name.trim()}
              activeOpacity={0.88}
              style={{
                borderRadius: 18,
                paddingVertical: 18,
                backgroundColor: name.trim() ? "#E8622A" : "#D5CFC8",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
                Continuar
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

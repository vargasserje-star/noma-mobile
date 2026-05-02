import { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
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

const CODE_LENGTH = 6;

export default function CodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, set } = useOnboarding();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));

  const isDomestic = draft.role === "DOMESTIC_HELP";
  const fullCode = code.join("");

  function handleChange(text: string, index: number) {
    const char = text.slice(-1).toUpperCase();
    const next = [...code];
    next[index] = char;
    setCode(next);
    setError(null);
    if (char && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (fullCode.length < CODE_LENGTH) {
      setError("Ingresa los 6 caracteres del código.");
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Demo: any 6-char code works
    await new Promise((r) => setTimeout(r, 800));

    set({
      code: fullCode,
      householdId: "demo-household-1",
      householdName: "Casa González",
    });
    setLoading(false);
    router.push("/onboarding/household-found");
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

          {/* Headline */}
          <Animated.Text
            entering={FadeIn.duration(300).delay(80)}
            style={{
              fontSize: 30,
              fontWeight: "800",
              color: "#1B4D3E",
              letterSpacing: -0.7,
              lineHeight: 36,
              marginBottom: 12,
            }}
          >
            {isDomestic
              ? "Ingresa el código\nque te dieron"
              : "Ingresa el código\nque te compartieron"}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.duration(300).delay(160)}
            style={{ fontSize: 15, color: "#7C7C7C", lineHeight: 22, marginBottom: 40 }}
          >
            {isDomestic
              ? "La persona que te contrató te compartió un código para que puedas entrar. Escríbelo aquí."
              : "La persona que administra tu hogar generó un código de 6 caracteres. Escríbelo aquí para unirte."}
          </Animated.Text>

          {/* OTP inputs — cada box entra escalonado */}
          <Animated.Text
            entering={FadeIn.duration(300).delay(240)}
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 14 }}
          >
            {isDomestic ? "Tu código" : "Código de 6 caracteres"}
          </Animated.Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 32, justifyContent: "center" }}>
            {code.map((char, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.duration(300).delay(320)}
                style={{
                  width: 48,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: "white",
                  borderWidth: 2,
                  borderColor: char ? "#1B4D3E" : "#E8E3DC",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <TextInput
                  ref={(el) => { inputs.current[i] = el; }}
                  value={char}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  maxLength={2}
                  autoCapitalize="characters"
                  keyboardType="default"
                  style={{
                    width: "100%",
                    height: "100%",
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: "800",
                    color: "#1B4D3E",
                  }}
                />
              </Animated.View>
            ))}
          </View>

          {/* Error */}
          {error && (
            <View style={{
              marginBottom: 20, borderRadius: 14, padding: 14,
              backgroundColor: "rgba(239,68,68,0.07)",
              borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
            }}>
              <Text style={{ fontSize: 13, color: "#DC2626", fontWeight: "500" }}>{error}</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* CTA */}
          <Animated.View entering={FadeIn.duration(300).delay(400)}>
            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading || fullCode.length < CODE_LENGTH}
              activeOpacity={0.88}
              style={{
                borderRadius: 18,
                paddingVertical: 18,
                backgroundColor: fullCode.length === CODE_LENGTH ? "#E8622A" : "#D5CFC8",
                alignItems: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
                  {isDomestic ? "Entrar" : "Verificar código"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

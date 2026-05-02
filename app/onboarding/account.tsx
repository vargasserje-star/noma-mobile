import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle } from "react-native-svg";
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

function MailIcon({ active }: { active: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6l-10 7L2 6" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ active }: { active: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={active ? "#1B4D3E" : "#C4C0B8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {open ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#C4C0B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={12} cy={12} r={3} stroke="#C4C0B8" strokeWidth={1.8} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#C4C0B8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M1 1l22 22" stroke="#C4C0B8" strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, set } = useOnboarding();
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = draft.role === "OWNER" || draft.role === "";

  function handleContinue() {
    if (!email.trim()) { setError("Ingresa tu correo electrónico."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Ingresa un correo válido, ej: nombre@gmail.com"); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    set({ email: email.trim(), password });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isOwner) {
      router.push("/onboarding/trial");
    } else {
      router.push("/onboarding/ready");
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
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 36 }}
            >
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 16 }}>
                <BackIcon />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
                <NomaLogo width={100} />
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
                marginBottom: 8,
              }}
            >
              Crea tu cuenta
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.duration(300).delay(160)}
              style={{ fontSize: 15, color: "#7C7C7C", marginBottom: 36, lineHeight: 22 }}
            >
              Solo necesitamos tu correo y una contraseña para guardar tu hogar.
            </Animated.Text>

            {/* Email */}
            <Animated.View entering={FadeIn.duration(300).delay(240)}>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 8 }}>
                Correo electrónico
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: "white", borderRadius: 16,
                borderWidth: 1.5, borderColor: email ? "#1B4D3E" : "#E8E3DC",
                paddingHorizontal: 16, paddingVertical: 15,
                marginBottom: 16,
              }}>
                <MailIcon active={!!email} />
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#C4C0B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ flex: 1, fontSize: 15, color: "#1A1A1A", fontWeight: "500" }}
                />
              </View>
            </Animated.View>

            {/* Password */}
            <Animated.View entering={FadeIn.duration(300).delay(320)}>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 8 }}>
                Contraseña
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: "white", borderRadius: 16,
                borderWidth: 1.5, borderColor: password ? "#1B4D3E" : "#E8E3DC",
                paddingHorizontal: 16, paddingVertical: 15,
                marginBottom: 28,
              }}>
                <LockIcon active={!!password} />
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#C4C0B8"
                  secureTextEntry={!showPass}
                  style={{ flex: 1, fontSize: 15, color: "#1A1A1A", fontWeight: "500" }}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <EyeIcon open={showPass} />
                </TouchableOpacity>
              </View>
            </Animated.View>

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
                onPress={handleContinue}
                activeOpacity={0.88}
                style={{
                  borderRadius: 18,
                  paddingVertical: 18,
                  backgroundColor: "#E8622A",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
                  Continuar
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useSession } from "@/lib/contexts/session-context";

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

export default function EmailScreen() {
  const { login } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await login(email.trim(), password);
      router.replace("/(app)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Credenciales incorrectas.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
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
          {/* Header */}
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{ width: 40, height: 40, justifyContent: "center" }}
            >
              <BackIcon />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 32 }}>
            <Text style={{
              fontSize: 30,
              fontWeight: "800",
              color: "#1B4D3E",
              letterSpacing: -0.8,
              marginBottom: 6,
            }}>
              Bienvenida
            </Text>
            <Text style={{ fontSize: 15, color: "#7C7C7C", marginBottom: 36 }}>
              Ingresa tu correo y contraseña
            </Text>

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 8 }}>
                Correo electrónico
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: "white", borderRadius: 16,
                borderWidth: 1.5, borderColor: email ? "#1B4D3E" : "#E8E3DC",
                paddingHorizontal: 16, paddingVertical: 15,
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
            </View>

            {/* Password */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: "#9A9A9A", marginBottom: 8 }}>
                Contraseña
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: "white", borderRadius: 16,
                borderWidth: 1.5, borderColor: password ? "#1B4D3E" : "#E8E3DC",
                paddingHorizontal: 16, paddingVertical: 15,
              }}>
                <LockIcon active={!!password} />
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder="••••••••"
                  placeholderTextColor="#C4C0B8"
                  secureTextEntry={!showPass}
                  style={{ flex: 1, fontSize: 15, color: "#1A1A1A", fontWeight: "500" }}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <EyeIcon open={showPass} />
                </TouchableOpacity>
              </View>
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

            {/* Login CTA */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
              style={{
                borderRadius: 18, paddingVertical: 17,
                backgroundColor: "#1B4D3E",
                alignItems: "center",
                opacity: loading ? 0.7 : 1,
                marginBottom: 12,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
                  Iniciar sesión
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

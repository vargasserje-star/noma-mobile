import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { NomaLogo } from "@/lib/components/noma-logo";

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#1A1A1A" />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6l-10 7L2 6" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const BUTTONS = [
  { label: "Continuar con Google", icon: <GoogleIcon />, action: "google" },
  { label: "Continuar con Apple", icon: <AppleIcon />, action: "apple" },
  { label: "Usar correo electrónico", icon: <MailIcon />, action: "email" },
] as const;

export default function CreateAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleOption(action: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === "email") {
      router.push("/onboarding/account");
    } else {
      Alert.alert("Próximamente", `Registro con ${action === "google" ? "Google" : "Apple"} estará disponible pronto.`);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
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
            fontSize: 32,
            fontWeight: "800",
            color: "#1B4D3E",
            letterSpacing: -0.8,
            lineHeight: 38,
            marginBottom: 10,
          }}
        >
          Crea tu cuenta
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.duration(300).delay(160)}
          style={{ fontSize: 15, color: "#7C7C7C", lineHeight: 22, marginBottom: 40 }}
        >
          Elige cómo quieres guardar tu hogar.
        </Animated.Text>

        {/* Auth options — staggered */}
        <View style={{ gap: 14 }}>
          {BUTTONS.map((btn, i) => (
            <Animated.View
              key={btn.action}
              entering={FadeIn.duration(300).delay(240)}
            >
              <TouchableOpacity
                onPress={() => handleOption(btn.action)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: "white",
                  borderRadius: 18,
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  borderWidth: 1.5,
                  borderColor: "#E8E3DC",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                {btn.icon}
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1A1A1A" }}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Animated.Text
          entering={FadeIn.duration(300).delay(320)}
          style={{ fontSize: 12, color: "#B0A89E", textAlign: "center", lineHeight: 18, marginTop: 24 }}
        >
          Al crear tu cuenta aceptas nuestros{"\n"}
          <Text style={{ textDecorationLine: "underline" }}>Términos de servicio</Text>
          {" "}y{" "}
          <Text style={{ textDecorationLine: "underline" }}>Política de privacidad</Text>.
        </Animated.Text>
      </View>
    </View>
  );
}

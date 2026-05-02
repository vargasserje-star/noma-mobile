import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { SvgCssUri } from "react-native-svg/css";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { useSession } from "@/lib/contexts/session-context";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const memberIconAsset = require("@/assets/icons/icono ya eres parte del hogar.svg");

const { width: SCREEN_WIDTH } = Dimensions.get("window");


function MemberIllustration() {
  const uri = Image.resolveAssetSource(memberIconAsset)?.uri;
  const size = SCREEN_WIDTH * 0.65;
  return (
    <View style={{ width: size, height: size }}>
      {uri ? <SvgCssUri uri={uri} width="100%" height="100%" /> : null}
    </View>
  );
}

export default function ReadyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, reset } = useOnboarding();
  const { signup } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDomestic = draft.role === "DOMESTIC_HELP";
  const firstName = draft.name?.split(" ")[0] || "Bienvenido";

  async function handleFinish() {
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isDomestic) {
        await signup({
          name: draft.name,
          email: draft.email || `domestic_${Date.now()}@noma.app`,
          password: draft.password || "noma2024!1",
          householdName: draft.householdName || "Mi Hogar",
          householdType: "FAMILY",
          city: "Mi Ciudad",
          country: "Colombia",
          hasEmployee: false,
          role: "DOMESTIC_HELP",
        });
        reset();
        router.replace("/(domestic)");
      } else {
        await signup({
          name: draft.name,
          email: draft.email || `member_${Date.now()}@noma.app`,
          password: draft.password || "noma2024!1",
          householdName: draft.householdName || "Mi Hogar",
          householdType: "FAMILY",
          city: "Mi Ciudad",
          country: "Colombia",
          hasEmployee: false,
          role: "MEMBER",
        });
        reset();
        router.replace("/(app)");
      }
    } catch (e: unknown) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Ocurrió un error. Intenta de nuevo.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          flexGrow: 1,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <Animated.View entering={FadeIn.duration(300)}>
          <MemberIllustration />
        </Animated.View>

        {/* Headline */}
        <Animated.Text
          entering={FadeIn.duration(300).delay(80)}
          style={{
            fontSize: 34,
            fontWeight: "800",
            color: "#1B4D3E",
            textAlign: "center",
            letterSpacing: -0.8,
            lineHeight: 40,
            marginTop: 28,
            marginBottom: 20,
            paddingHorizontal: 28,
          }}
        >
          {isDomestic
            ? `${firstName}, ya puedes\nempezar.`
            : `${firstName}, ya eres\nparte del hogar.`}
        </Animated.Text>

        {/* Body */}
        <Animated.View entering={FadeIn.duration(300).delay(160)} style={{ paddingHorizontal: 28 }}>
          {isDomestic ? (
            <Text style={{ fontSize: 16, color: "#5C5C5C", textAlign: "center", lineHeight: 25, marginBottom: 12 }}>
              Aquí van a aparecer todas las tareas que te asignen. Todo claro, sin mensajes de texto de por medio.
            </Text>
          ) : (
            <Text style={{ fontSize: 16, color: "#5C5C5C", textAlign: "center", lineHeight: 25, marginBottom: 12 }}>
              Ya puedes ver tus tareas, el menú de la semana y todo lo que está pasando en casa. Tu parte es simple: saber qué te toca y hacerlo.
            </Text>
          )}
        </Animated.View>

        {error && (
          <View style={{
            marginTop: 20, marginHorizontal: 28, borderRadius: 14, padding: 14,
            backgroundColor: "rgba(239,68,68,0.07)",
            borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
            width: SCREEN_WIDTH - 56,
          }}>
            <Text style={{ fontSize: 13, color: "#DC2626", fontWeight: "500", textAlign: "center" }}>{error}</Text>
          </View>
        )}

        <View style={{ flex: 1, minHeight: 32 }} />

        {/* CTA */}
        <Animated.View
          entering={FadeIn.duration(300).delay(240)}
          style={{ marginHorizontal: 28, width: SCREEN_WIDTH - 56 }}
        >
        <TouchableOpacity
          onPress={handleFinish}
          disabled={loading}
          activeOpacity={0.88}
          style={{
            borderRadius: 18,
            paddingVertical: 18,
            backgroundColor: "#E8622A",
            alignItems: "center",
            shadowColor: "#E8622A",
            shadowOpacity: 0.3,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              {isDomestic ? "Entrar a mis tareas" : "Ver mi hogar"}
            </Text>
          )}
        </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

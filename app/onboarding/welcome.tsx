import { useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { NomaLogo } from "@/lib/components/noma-logo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const familyImage = require("@/assets/images/Familia pantalla 1 Noma onboardingg-01.webp");

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === current ? "#1B4D3E" : "#D5CFC8",
          }}
        />
      ))}
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { set } = useOnboarding();
  const params = useLocalSearchParams<{ email?: string; password?: string }>();

  useEffect(() => {
    if (params.email || params.password) {
      set({ email: params.email ?? "", password: params.password ?? "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
      {/* Logo */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{ paddingTop: insets.top + 20, paddingHorizontal: 28, alignItems: "center" }}
      >
        <NomaLogo width={160} />
      </Animated.View>

      {/* Illustration */}
      <Animated.View
        entering={FadeIn.duration(300).delay(80)}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Image
          source={familyImage}
          style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.9 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Copy + CTA */}
      <View style={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 32 }}>
        <View style={{ alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Animated.Text
            entering={FadeIn.duration(300).delay(160)}
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: "#1B4D3E",
              textAlign: "center",
              lineHeight: 34,
              letterSpacing: -0.7,
            }}
          >
            El hogar no debería{"\n"}depender de una{"\n"}sola persona.
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(300).delay(240)}
            style={{ fontSize: 15, color: "#7C7C7C", textAlign: "center", lineHeight: 22 }}
          >
            Noma distribuye la carga, coordina a todos y hace que tu casa funcione aunque tú no estés pensando en ella.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeIn.duration(300).delay(320)}>
          <Dots current={0} total={3} />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/role")}
            activeOpacity={0.88}
            style={{
              marginTop: 24,
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: "#1B4D3E",
              alignItems: "center",
              shadowColor: "#1B4D3E",
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 5,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              Empezar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

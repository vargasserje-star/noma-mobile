import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
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

function InviteIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke="white" strokeWidth={2} />
      <Path d="M19 8v6M22 11h-6" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function InviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Animated.Text
          entering={FadeIn.duration(300).delay(80)}
          style={{
            fontSize: 36,
            fontWeight: "800",
            color: "#1B4D3E",
            letterSpacing: -1,
            lineHeight: 42,
            marginBottom: 16,
          }}
        >
          ¿Quieres invitar{"\n"}a alguien ahora?
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.duration(300).delay(160)}
          style={{
            fontSize: 15,
            color: "#7C7C7C",
            lineHeight: 24,
            marginBottom: 48,
          }}
        >
          Puedes invitar a las personas que viven contigo o te ayudan en casa. También puedes hacerlo después desde configuración.
        </Animated.Text>

        {/* Primary CTA */}
        <Animated.View entering={FadeIn.duration(300).delay(240)}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/onboarding/invite-who");
            }}
            activeOpacity={0.88}
            style={{
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: "#E8622A",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              marginBottom: 14,
              shadowColor: "#E8622A",
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
              elevation: 4,
            }}
          >
            <InviteIcon />
            <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              Invitar personas
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Secondary CTA */}
        <Animated.View entering={FadeIn.duration(300).delay(320)}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/(app)");
            }}
            activeOpacity={0.7}
            style={{
              borderRadius: 18,
              paddingVertical: 18,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: "#D5CFC8",
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#5C5C5C", letterSpacing: -0.3 }}>
              Ahora no, entrar a mi hogar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

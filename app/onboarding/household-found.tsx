import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { NomaLogo } from "@/lib/components/noma-logo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const welcomeImage = require("@/assets/images/Imagen bienvenido a NOMA.webp");

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HouseIllustration() {
  return (
    <Svg width={120} height={90} viewBox="0 0 120 90">
      {/* House body */}
      <Rect x={20} y={38} width={80} height={50} rx={6} fill="#E8E0D5" />
      {/* Roof */}
      <Path d="M12 40 L60 8 L108 40" fill="#1B4D3E" />
      {/* Door */}
      <Rect x={48} y={60} width={24} height={28} rx={4} fill="#E8622A" />
      {/* Windows */}
      <Rect x={26} y={50} width={18} height={14} rx={3} fill="#C5DDCF" />
      <Rect x={76} y={50} width={18} height={14} rx={3} fill="#C5DDCF" />
    </Svg>
  );
}

function TaskIllustration() {
  return (
    <Svg width={140} height={100} viewBox="0 0 140 100">
      {/* Card */}
      <Rect x={20} y={10} width={100} height={80} rx={12} fill="white" />
      {/* Title line */}
      <Rect x={36} y={24} width={60} height={8} rx={4} fill="#E8E3DC" />
      {/* Task rows */}
      <Circle cx={38} cy={48} r={7} fill="#1B4D3E" />
      <Path d="M34 48l3 3 5-5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={52} y={44} width={50} height={7} rx={3} fill="#E8E3DC" />

      <Circle cx={38} cy={66} r={7} fill="#1B4D3E" />
      <Path d="M34 66l3 3 5-5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={52} y={62} width={40} height={7} rx={3} fill="#E8E3DC" />

      <Circle cx={38} cy={84} r={7} fill="#E8E3DC" />
      <Rect x={52} y={80} width={46} height={7} rx={3} fill="#F0EDE8" />
    </Svg>
  );
}

export default function HouseholdFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft } = useOnboarding();

  const isDomestic = draft.role === "DOMESTIC_HELP";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          {/* Illustration */}
          <Animated.View
            entering={FadeIn.duration(300).delay(80)}
            style={{ marginBottom: 28 }}
          >
            {isDomestic ? (
              <TaskIllustration />
            ) : (
              <Image
                source={welcomeImage}
                style={{ width: SCREEN_WIDTH * 0.6, height: SCREEN_WIDTH * 0.6, borderRadius: 20 }}
                resizeMode="cover"
              />
            )}
          </Animated.View>

          {/* Headline */}
          <Animated.Text
            entering={FadeIn.duration(300).delay(160)}
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: "#1B4D3E",
              textAlign: "center",
              letterSpacing: -0.8,
              lineHeight: 38,
              marginBottom: 16,
            }}
          >
            {isDomestic ? "¡Listo! Ya\nencontramos\ntu hogar." : "¡Encontramos\ntu hogar!"}
          </Animated.Text>

          {isDomestic ? (
            <Animated.Text
              entering={FadeIn.duration(300).delay(240)}
              style={{ fontSize: 16, color: "#7C7C7C", textAlign: "center", lineHeight: 24 }}
            >
              Aquí vas a ver tus tareas del día y marcar las que vas completando.
            </Animated.Text>
          ) : (
            <>
              <Animated.Text
                entering={FadeIn.duration(300).delay(320)}
                style={{ fontSize: 15, color: "#7C7C7C", textAlign: "center", marginBottom: 20 }}
              >
                Vas a unirte al hogar de
              </Animated.Text>

              {/* Household name card */}
              <Animated.View
                entering={FadeIn.duration(300).delay(400)}
                style={{
                  backgroundColor: "white",
                  borderRadius: 20,
                  paddingHorizontal: 28,
                  paddingVertical: 20,
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1.5,
                  borderColor: "#E8E3DC",
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                  width: "100%",
                }}
              >
                <NomaLogo width={56} />
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#1B4D3E", letterSpacing: -0.5 }}>
                  {draft.householdName}
                </Text>
              </Animated.View>

              <Animated.Text
                entering={FadeIn.duration(300).delay(480)}
                style={{ fontSize: 15, color: "#7C7C7C", textAlign: "center", lineHeight: 22, marginBottom: 8 }}
              >
                como miembro. Desde aquí vas a ver tus tareas, el menú de la semana y lo que hay pendiente en casa.
              </Animated.Text>
            </>
          )}
        </View>

        <View style={{ height: 32 }} />

        {/* CTA */}
        <Animated.View entering={FadeIn.duration(300).delay(560)}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/onboarding/name");
            }}
            activeOpacity={0.88}
            style={{
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: "#E8622A",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              {isDomestic ? "Ver mis tareas" : "Unirme"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

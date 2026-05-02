import { View, Text, TouchableOpacity, ScrollView } from "react-native";
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

type FeatureItem = { icon: React.ReactNode; label: string; checked: boolean };

function FeatureRow({ icon, label, checked, index }: FeatureItem & { index: number }) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        backgroundColor: "white",
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: "#E8E3DC",
      }}
    >
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: checked ? "#E8F5F0" : "#F5F0EB",
        justifyContent: "center",
        alignItems: "center",
      }}>
        {icon}
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#1A1A1A" }}>
        {label}
      </Text>
      {checked && (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={10} fill="#1B4D3E" />
          <Path d="M8 12l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </Animated.View>
  );
}

function PersonIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke="#1B4D3E" strokeWidth={1.8} />
    </Svg>
  );
}

function DollarIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#1B4D3E" strokeWidth={1.8} />
      <Path d="M12 6v12M15 9H10.5a2.5 2.5 0 0 0 0 5H14a2.5 2.5 0 0 1 0 5H9" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PeopleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke="#1B4D3E" strokeWidth={1.8} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 4L12 14.01l-3-3" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function TrialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const features: FeatureItem[] = [
    { icon: <PersonIcon />, label: "Módulo de empleada", checked: false },
    { icon: <DollarIcon />, label: "Finanzas completas", checked: false },
    { icon: <PeopleIcon />, label: "Miembros ilimitados", checked: false },
    { icon: <CheckCircleIcon />, label: "Todo activo desde hoy. Sin tarjeta de crédito.", checked: false },
  ];

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
          entering={FadeIn.duration(300).delay(80)}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 36 }}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 16 }}>
            <BackIcon />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
            <NomaLogo />
          </View>
        </Animated.View>

        {/* Badge */}
        <Animated.View
          entering={FadeIn.duration(300).delay(160)}
          style={{ alignSelf: "flex-start", marginBottom: 20 }}
        >
          <View style={{
            backgroundColor: "#E8F5F0",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 6,
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1B4D3E", letterSpacing: 0.3 }}>
              30 días gratis
            </Text>
          </View>
        </Animated.View>

        {/* Headline */}
        <Animated.Text
          entering={FadeIn.duration(300).delay(240)}
          style={{
            fontSize: 34,
            fontWeight: "800",
            color: "#1B4D3E",
            letterSpacing: -0.8,
            lineHeight: 40,
            marginBottom: 36,
          }}
        >
          Tienes 30 días para probar todo Noma sin límites.
        </Animated.Text>

        {/* Feature rows */}
        <View style={{ gap: 10, marginBottom: 28 }}>
          {features.map((f, i) => (
            <FeatureRow key={i} {...f} index={i} />
          ))}
        </View>

        {/* Fine print */}
        <Animated.Text
          entering={FadeIn.duration(300).delay(320)}
          style={{ fontSize: 13, color: "#9A9A9A", lineHeight: 20, textAlign: "center", marginBottom: 8 }}
        >
          Al finalizar los 30 días puedes continuar gratis con funciones básicas o activar Noma Hogar por{" "}
          <Text style={{ fontWeight: "700" }}>$20.000 COP</Text> al mes.
        </Animated.Text>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/onboarding/household-name");
            }}
            activeOpacity={0.88}
            style={{
              marginTop: 28,
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: "#E8622A",
              alignItems: "center",
              shadowColor: "#E8622A",
              shadowOpacity: 0.3,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 5,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              Empezar mi prueba gratis
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

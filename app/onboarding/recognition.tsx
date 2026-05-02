import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

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

export default function RecognitionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1,
      backgroundColor: "#F5F0EB",
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 32,
      paddingHorizontal: 32,
    }}>
      {/* Back */}
      <Animated.View entering={FadeIn.duration(300)}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginBottom: 32 }}>
          <BackIcon />
        </TouchableOpacity>
      </Animated.View>

      {/* Copy — centered vertically */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Animated.Text
          entering={FadeIn.duration(300).delay(80)}
          style={{
            fontSize: 34,
            fontWeight: "800",
            color: "#1B4D3E",
            lineHeight: 42,
            letterSpacing: -1,
            marginBottom: 28,
          }}
        >
          Si llegaste aquí, probablemente llevas tiempo cargando con todo.
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.duration(300).delay(160)}
          style={{
            fontSize: 16,
            color: "#5C5C5C",
            lineHeight: 26,
            marginBottom: 20,
          }}
        >
          Las compras, las tareas, los pagos, las instrucciones que nadie más recuerda. Lo haces en silencio, funciona porque tú lo sostienes, y casi nadie lo ve.
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.duration(300).delay(240)}
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: "#1B4D3E",
            lineHeight: 26,
          }}
        >
          Eso termina hoy.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeIn.duration(300).delay(320)}>
        <Dots current={1} total={5} />
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/onboarding/household-type");
          }}
          activeOpacity={0.88}
          style={{
            marginTop: 28,
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
            Así es, quiero que cambie
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

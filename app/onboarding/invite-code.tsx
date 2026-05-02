import { useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeIn } from "react-native-reanimated";
import { NomaLogo } from "@/lib/components/noma-logo";

const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return code;
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CopyIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={9} width={13} height={13} rx={2} stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WhatsAppIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function InviteMoreIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#5C5C5C" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke="#5C5C5C" strokeWidth={1.8} />
      <Path d="M19 8v6M22 11h-6" stroke="#5C5C5C" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function InviteCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, canSeeFinances } = useLocalSearchParams<{ role: string; canSeeFinances: string }>();
  const [code] = useState(() => generateCode());
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = encodeURIComponent(
      `Te invito a unirte a nuestro hogar en Noma. Descarga la app y usa el código: ${code}. Tienes 48 horas para usarlo.`
    );
    Linking.openURL(`whatsapp://send?text=${message}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${message}`);
    });
  }

  function handleInviteAnother() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(app)");
  }

  const roleLabel =
    role === "OWNER" ? "Segundo administrador"
    : role === "DOMESTIC_HELP" ? "Empleada doméstica"
    : "Miembro del hogar";

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
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 36 }}
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
          fontSize: 34,
          fontWeight: "800",
          color: "#1B4D3E",
          letterSpacing: -0.8,
          lineHeight: 40,
          marginBottom: 6,
          textAlign: "center",
        }}
      >
        Código listo
      </Animated.Text>

      <Animated.Text
        entering={FadeIn.duration(300).delay(160)}
        style={{ fontSize: 13, color: "#9A9A9A", textAlign: "center", marginBottom: 8, fontWeight: "600", letterSpacing: 0.5 }}
      >
        {roleLabel.toUpperCase()}
      </Animated.Text>

      <Animated.Text
        entering={FadeIn.duration(300).delay(240)}
        style={{ fontSize: 14, color: "#7C7C7C", textAlign: "center", marginBottom: 28 }}
      >
        Tu código de invitación
      </Animated.Text>

      {/* Code box */}
      <Animated.View
        entering={FadeIn.duration(300).delay(320)}
        style={{
          backgroundColor: "white",
          borderRadius: 20,
          borderWidth: 2,
          borderColor: "#1B4D3E",
          borderStyle: "dashed",
          padding: 28,
          alignItems: "center",
          marginBottom: 16,
          position: "relative",
        }}
      >
        <Text style={{
          fontSize: 48,
          fontWeight: "800",
          color: "#1B4D3E",
          letterSpacing: 10,
          fontVariant: ["tabular-nums"],
        }}>
          {code}
        </Text>

        {/* Copy button inside box */}
        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.7}
          style={{
            position: "absolute",
            bottom: 12,
            right: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: copied ? "#E8F5F0" : "#F5F0EB",
          }}
        >
          <CopyIcon />
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#1B4D3E" }}>
            {copied ? "¡Copiado!" : "Copiar"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.Text
        entering={FadeIn.duration(300).delay(400)}
        style={{ fontSize: 13, color: "#9A9A9A", textAlign: "center", lineHeight: 20, marginBottom: 32 }}
      >
        Compártelo con la persona que quieres invitar.{"\n"}Tiene 48 horas para usarlo.
      </Animated.Text>

      <View style={{ flex: 1 }} />

      {/* Action buttons */}
      <View style={{ gap: 12 }}>
        {/* WhatsApp */}
        <Animated.View entering={FadeIn.duration(300).delay(480)}>
          <TouchableOpacity
            onPress={handleWhatsApp}
            activeOpacity={0.88}
            style={{
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: "#25D366",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              shadowColor: "#25D366",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
              elevation: 4,
            }}
          >
            <WhatsAppIcon />
            <Text style={{ fontSize: 16, fontWeight: "800", color: "white", letterSpacing: -0.2 }}>
              Compartir por WhatsApp
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Invite another */}
        <Animated.View entering={FadeIn.duration(300).delay(560)}>
          <TouchableOpacity
            onPress={handleInviteAnother}
            activeOpacity={0.7}
            style={{
              borderRadius: 18,
              paddingVertical: 17,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              borderWidth: 1.5,
              borderColor: "#D5CFC8",
            }}
          >
            <InviteMoreIcon />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#5C5C5C", letterSpacing: -0.2 }}>
              Invitar a otra persona
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Done */}
        <Animated.View entering={FadeIn.duration(300).delay(560)}>
          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={0.7}
            style={{
              borderRadius: 18,
              paddingVertical: 17,
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: "#D5CFC8",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#5C5C5C", letterSpacing: -0.2 }}>
              Listo, entrar a mi hogar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

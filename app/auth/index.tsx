import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { NomaLogo } from "@/lib/components/noma-logo";

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#000" />
    </Svg>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1,
      backgroundColor: "#F5F0EB",
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 32,
      paddingHorizontal: 28,
    }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 40 }}>
        <NomaLogo />

        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={{
            fontSize: 36,
            fontWeight: "800",
            color: "#1B4D3E",
            textAlign: "center",
            lineHeight: 42,
            letterSpacing: -0.9,
          }}>
            Bienvenido{"\n"}de vuelta
          </Text>
          <Text style={{
            fontSize: 16,
            color: "#7C7C7C",
            textAlign: "center",
            lineHeight: 23,
          }}>
            Inicia sesión para volver a tu hogar.
          </Text>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={() => Alert.alert("Próximamente", "Inicio de sesión con Google estará disponible pronto.")}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: "white",
            borderRadius: 16,
            paddingVertical: 17,
            borderWidth: 1,
            borderColor: "#E0DAD3",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <GoogleIcon />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#1A1A1A" }}>
            Continuar con Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Alert.alert("Próximamente", "Inicio de sesión con Apple estará disponible pronto.")}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: "white",
            borderRadius: 16,
            paddingVertical: 17,
            borderWidth: 1,
            borderColor: "#E0DAD3",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <AppleIcon />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#1A1A1A" }}>
            Continuar con Apple
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/auth/email")}
          activeOpacity={0.7}
          style={{ alignItems: "center", paddingVertical: 16 }}
        >
          <Text style={{ fontSize: 15, color: "#1B4D3E", fontWeight: "600", textDecorationLine: "underline" }}>
            Usar correo electrónico
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

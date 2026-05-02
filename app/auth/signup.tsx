import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";
import * as Haptics from "expo-haptics";

import { useSession } from "@/lib/contexts/session-context";

function EyeIcon({ open, color }: { open: boolean; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {open ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M1 1l22 22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDown({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const HOUSEHOLD_TYPES = [
  { key: "FAMILY", label: "Familia" },
  { key: "COUPLE", label: "Pareja" },
  { key: "SHARED", label: "Hogar compartido" },
  { key: "SOLO", label: "Solo/a" },
];

type FieldKey =
  | "name" | "email" | "password" | "householdName" | "city" | "country";

function InputField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightElement,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences";
  rightElement?: React.ReactNode;
  active: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{
        fontSize: 10, fontWeight: "700", letterSpacing: 1.8,
        textTransform: "uppercase", color: "#737373", marginBottom: 8,
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "white", borderRadius: 18,
        borderWidth: 1.5, borderColor: active ? "#0D7655" : "rgba(0,0,0,0.07)",
        paddingHorizontal: 16, paddingVertical: 15,
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }, elevation: 1,
      }}>
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c4c0b8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={false}
          style={{ flex: 1, fontSize: 15, color: "#101111", fontWeight: "500" }}
        />
        {rightElement}
      </View>
    </View>
  );
}

export default function SignupScreen() {
  const { signup } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [householdType, setHouseholdType] = useState<string>("FAMILY");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [hasEmployee, setHasEmployee] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedTypeLabel =
    HOUSEHOLD_TYPES.find((t) => t.key === householdType)?.label ?? "Familia";

  function clearError() {
    if (error) setError(null);
  }

  async function handleSignup() {
    if (!name.trim()) { setError("Ingresa tu nombre completo."); return; }
    if (!email.trim()) { setError("Ingresa tu correo electrónico."); return; }
    if (!password || password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (!householdName.trim()) { setError("¿Cómo se llama tu hogar?"); return; }
    if (!city.trim()) { setError("Ingresa tu ciudad."); return; }
    if (!country.trim()) { setError("Ingresa tu país."); return; }
    if (hasEmployee === null) { setError("Indica si cuentas con empleada de hogar."); return; }

    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        householdName: householdName.trim(),
        householdType,
        city: city.trim(),
        country: country.trim(),
        hasEmployee: hasEmployee ?? false,
      });
      router.replace("/(app)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear el hogar.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0ea" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ─────────────────────────────────────────────── */}
          <View style={{
            backgroundColor: "#0d3d2b",
            paddingTop: insets.top + 20,
            paddingBottom: 28,
            paddingHorizontal: 28,
          }}>
            {/* Back + wordmark */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M19 12H5M12 19l-7-7 7-7" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: "white", letterSpacing: -0.8 }}>
                  NOMA
                </Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF6A00" }} />
              </View>
            </View>

            {/* Title */}
            <View style={{ marginTop: 28 }}>
              <Text style={{ fontSize: 30, fontWeight: "800", color: "white", letterSpacing: -0.8, lineHeight: 36 }}>
                Crea tu{"\n"}
                <Text style={{ color: "#FF6A00" }}>hogar</Text> en Noma.
              </Text>
              <Text style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 20, fontWeight: "500" }}>
                Configúralo en menos de un minuto.
              </Text>
            </View>

            {/* Step pills */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 20 }}>
              {["Tú", "Tu hogar", "Ubicación", "Empleada"].map((label, i) => (
                <View key={label} style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: i === 0 ? "#FF6A00" : "rgba(255,255,255,0.12)",
                }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Form ─────────────────────────────────────────────── */}
          <View style={{ padding: 20 }}>

            {/* — Section: Tu información — */}
            <Text style={{
              fontSize: 11, fontWeight: "700", letterSpacing: 1.5,
              textTransform: "uppercase", color: "#0D7655", marginBottom: 14, marginTop: 4,
            }}>
              Tu información
            </Text>

            <InputField
              label="Nombre completo"
              icon={<UserIcon color={name ? "#0D7655" : "#c4c0b8"} />}
              value={name}
              onChangeText={(v) => { setName(v); clearError(); }}
              placeholder="María García"
              autoCapitalize="words"
              active={!!name}
            />

            <InputField
              label="Correo electrónico"
              icon={<MailIcon color={email ? "#0D7655" : "#c4c0b8"} />}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              active={!!email}
            />

            <InputField
              label="Contraseña"
              icon={<LockIcon color={password ? "#0D7655" : "#c4c0b8"} />}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError(); }}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              active={!!password}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPass((v) => !v)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <EyeIcon open={showPass} color="#c4c0b8" />
                </TouchableOpacity>
              }
            />

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 20 }} />

            {/* — Section: Tu hogar — */}
            <Text style={{
              fontSize: 11, fontWeight: "700", letterSpacing: 1.5,
              textTransform: "uppercase", color: "#0D7655", marginBottom: 14,
            }}>
              Tu hogar
            </Text>

            <InputField
              label="Nombre del hogar"
              icon={<HomeIcon color={householdName ? "#0D7655" : "#c4c0b8"} />}
              value={householdName}
              onChangeText={(v) => { setHouseholdName(v); clearError(); }}
              placeholder="Casa García, Familia López…"
              autoCapitalize="words"
              active={!!householdName}
            />

            {/* Household type picker */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{
                fontSize: 10, fontWeight: "700", letterSpacing: 1.8,
                textTransform: "uppercase", color: "#737373", marginBottom: 8,
              }}>
                Tipo de hogar
              </Text>
              <TouchableOpacity
                onPress={() => setShowTypePicker((v) => !v)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  backgroundColor: "white", borderRadius: 18,
                  borderWidth: 1.5, borderColor: "#0D7655",
                  paddingHorizontal: 16, paddingVertical: 15,
                  shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, elevation: 1,
                }}
              >
                <HomeIcon color="#0D7655" />
                <Text style={{ flex: 1, fontSize: 15, color: "#101111", fontWeight: "500" }}>
                  {selectedTypeLabel}
                </Text>
                <ChevronDown color="#c4c0b8" />
              </TouchableOpacity>

              {showTypePicker && (
                <View style={{
                  marginTop: 6, backgroundColor: "white", borderRadius: 18, overflow: "hidden",
                  borderWidth: 1.5, borderColor: "rgba(0,0,0,0.07)",
                  shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 }, elevation: 4,
                }}>
                  {HOUSEHOLD_TYPES.map((t, i) => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => { setHouseholdType(t.key); setShowTypePicker(false); }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                        paddingHorizontal: 18, paddingVertical: 14,
                        borderBottomWidth: i < HOUSEHOLD_TYPES.length - 1 ? 1 : 0,
                        borderBottomColor: "rgba(0,0,0,0.05)",
                        backgroundColor: householdType === t.key ? "rgba(13,118,85,0.05)" : "transparent",
                      }}
                    >
                      <Text style={{
                        fontSize: 15, fontWeight: "500",
                        color: householdType === t.key ? "#0D7655" : "#101111",
                      }}>
                        {t.label}
                      </Text>
                      {householdType === t.key && (
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          <Path d="M20 6L9 17l-5-5" stroke="#0D7655" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 20 }} />

            {/* — Section: Ubicación — */}
            <Text style={{
              fontSize: 11, fontWeight: "700", letterSpacing: 1.5,
              textTransform: "uppercase", color: "#0D7655", marginBottom: 14,
            }}>
              Ubicación
            </Text>

            <InputField
              label="Ciudad"
              icon={<MapPinIcon color={city ? "#0D7655" : "#c4c0b8"} />}
              value={city}
              onChangeText={(v) => { setCity(v); clearError(); }}
              placeholder="Bogotá, Ciudad de México…"
              autoCapitalize="words"
              active={!!city}
            />

            <InputField
              label="País"
              icon={<GlobeIcon color={country ? "#0D7655" : "#c4c0b8"} />}
              value={country}
              onChangeText={(v) => { setCountry(v); clearError(); }}
              placeholder="Colombia, México, España…"
              autoCapitalize="words"
              active={!!country}
            />

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 20 }} />

            {/* — Section: Empleada de hogar — */}
            <Text style={{
              fontSize: 11, fontWeight: "700", letterSpacing: 1.5,
              textTransform: "uppercase", color: "#0D7655", marginBottom: 6,
            }}>
              Empleada de hogar
            </Text>
            <Text style={{ fontSize: 13, color: "#A3A3A3", fontWeight: "500", marginBottom: 14, lineHeight: 18 }}>
              ¿Tienes una empleada que trabaje en casa? Activa su módulo para gestionar tareas, horarios y pagos.
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
              {/* Sí */}
              <TouchableOpacity
                onPress={() => { setHasEmployee(true); clearError(); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, borderRadius: 20, paddingVertical: 18, alignItems: "center", gap: 8,
                  backgroundColor: hasEmployee === true ? "#D8EEE5" : "white",
                  borderWidth: 1.5,
                  borderColor: hasEmployee === true ? "#0D7655" : "rgba(0,0,0,0.08)",
                  shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, elevation: 1,
                }}
              >
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={hasEmployee === true ? "#0D7655" : "#c4c0b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={12} cy={7} r={4} stroke={hasEmployee === true ? "#0D7655" : "#c4c0b8"} strokeWidth={1.8} />
                  <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={hasEmployee === true ? "#0D7655" : "#c4c0b8"} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
                <Text style={{
                  fontSize: 14, fontWeight: "700",
                  color: hasEmployee === true ? "#0D7655" : "#737373",
                }}>
                  Sí, tengo
                </Text>
                {hasEmployee === true && (
                  <View style={{
                    position: "absolute", top: 10, right: 10,
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: "#0D7655", alignItems: "center", justifyContent: "center",
                  }}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                      <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                )}
              </TouchableOpacity>

              {/* No */}
              <TouchableOpacity
                onPress={() => { setHasEmployee(false); clearError(); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, borderRadius: 20, paddingVertical: 18, alignItems: "center", gap: 8,
                  backgroundColor: hasEmployee === false ? "#FFF4EA" : "white",
                  borderWidth: 1.5,
                  borderColor: hasEmployee === false ? "#FF6A00" : "rgba(0,0,0,0.08)",
                  shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, elevation: 1,
                }}
              >
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={hasEmployee === false ? "#FF6A00" : "#c4c0b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={12} cy={7} r={4} stroke={hasEmployee === false ? "#FF6A00" : "#c4c0b8"} strokeWidth={1.8} />
                </Svg>
                <Text style={{
                  fontSize: 14, fontWeight: "700",
                  color: hasEmployee === false ? "#FF6A00" : "#737373",
                }}>
                  No, por ahora
                </Text>
                {hasEmployee === false && (
                  <View style={{
                    position: "absolute", top: 10, right: 10,
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: "#FF6A00", alignItems: "center", justifyContent: "center",
                  }}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                      <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {hasEmployee === false && (
              <Text style={{ fontSize: 11, color: "#a3a3a3", fontWeight: "500", textAlign: "center", marginTop: 6 }}>
                Lo puedes activar cuando quieras desde Perfil.
              </Text>
            )}

            {/* Error */}
            {error && (
              <View style={{
                marginTop: 4, marginBottom: 16, borderRadius: 16, padding: 14,
                backgroundColor: "rgba(239,68,68,0.07)",
                borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
                flexDirection: "row", alignItems: "center", gap: 10,
              }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke="#EF4444" strokeWidth={1.8} />
                  <Path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
                <Text style={{ flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "500" }}>{error}</Text>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.88}
              style={{
                marginTop: error ? 0 : 8,
                borderRadius: 20, paddingVertical: 17,
                backgroundColor: "#0D7655",
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                shadowColor: "#0D7655", shadowOpacity: 0.35, shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 }, elevation: 6,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
                    Crear mi hogar
                  </Text>
                  <ArrowIcon color="white" />
                </>
              )}
            </TouchableOpacity>

            {/* Back to login */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{ alignItems: "center", marginTop: 20, padding: 8 }}
            >
              <Text style={{ fontSize: 13, color: "#a3a3a3", fontWeight: "500" }}>
                ¿Ya tienes cuenta?{" "}
                <Text style={{ color: "#0D7655", fontWeight: "700" }}>Iniciar sesión</Text>
              </Text>
            </TouchableOpacity>

            {/* Legal note */}
            <Text style={{
              textAlign: "center", fontSize: 11, color: "#c4c0b8",
              fontWeight: "500", lineHeight: 16, marginTop: 12,
            }}>
              Al crear tu hogar aceptas los{" "}
              <Text style={{ color: "#0D7655" }}>Términos de uso</Text>
              {" "}y la{" "}
              <Text style={{ color: "#0D7655" }}>Política de privacidad</Text>
              {" "}de Noma.
            </Text>

            <View style={{ height: insets.bottom + 24 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

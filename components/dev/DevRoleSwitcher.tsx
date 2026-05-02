import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/contexts/session-context";
import { roleOptions, roleMeta, type AppRoleKey } from "@/lib/access-control";

const ROLE_COLORS: Record<AppRoleKey, { bg: string; text: string; border: string }> = {
  OWNER:         { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  MEMBER:        { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  DOMESTIC_HELP: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
};

const ROLE_LABELS: Record<AppRoleKey, string> = {
  OWNER:         "Propietario",
  MEMBER:        "Miembro",
  DOMESTIC_HELP: "Empleada",
};

export function DevRoleSwitcher() {
  if (!__DEV__) return null;

  const { session, setDevRole } = useSession();
  const router = useRouter();
  const current = session?.role ?? "OWNER";

  async function switchTo(role: AppRoleKey) {
    if (role === current) return;
    await setDevRole(role);
    // Navigate to the correct stack for the new role
    if (role === "DOMESTIC_HELP") {
      router.replace("/(domestic)");
    } else {
      router.replace("/(app)");
    }
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: "#FCD34D",
        backgroundColor: "#FFFBEB",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View
          style={{
            backgroundColor: "#FCD34D",
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "800", color: "#92400E", letterSpacing: 1, textTransform: "uppercase" }}>
            DEV
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#78350F" }}>
          Cambiar rol (solo en desarrollo)
        </Text>
      </View>

      {/* Role buttons */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
        {roleOptions.map((role) => {
          const isActive = role === current;
          const colors = ROLE_COLORS[role];
          return (
            <TouchableOpacity
              key={role}
              onPress={() => void switchTo(role)}
              activeOpacity={0.75}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? colors.text : colors.border,
                backgroundColor: isActive ? colors.bg : "white",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: colors.text }}>
                {ROLE_LABELS[role]}
              </Text>
              {isActive && (
                <Text style={{ marginTop: 2, fontSize: 8, color: colors.text, opacity: 0.7 }}>
                  ● activo
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

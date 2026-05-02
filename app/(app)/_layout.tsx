import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useSession } from "@/lib/contexts/session-context";
import { getTopTabsForRole } from "@/lib/access-control";
import { TabIcon } from "@/components/shell/TabIcon";

type TabId = "home" | "tasks" | "finances" | "employee" | "menus" | "savings" | "evidence" | "profile";

const TAB_ROUTE_NAMES: Record<TabId, string> = {
  home:     "index",
  tasks:    "tasks",
  finances: "finances",
  employee: "employee",
  menus:    "menus",
  savings:  "savings",
  evidence: "evidence",
  profile:  "profile",
};

const TAB_LABELS: Record<TabId, string> = {
  home:     "Hogar",
  tasks:    "Tareas",
  finances: "Finanzas",
  employee: "Asistente",
  menus:    "Menús",
  savings:  "Mesadas",
  evidence: "Evidencia",
  profile:  "Perfil",
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  const role = session?.role ?? "OWNER";
  const householdType = session?.householdType ?? "FAMILY";
  const canViewFinances = session?.canViewFinances ?? role === "OWNER";
  const rawIds = getTopTabsForRole(role, householdType, canViewFinances).slice(0, 5);
  const tabIds = rawIds.filter((id): id is TabId => id in TAB_ROUTE_NAMES);

  return (
    <View
      style={{
        paddingBottom: insets.bottom,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.07)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 }}>
        {tabIds.map((id) => {
          const routeName = TAB_ROUTE_NAMES[id];
          const tabIndex = state.routes.findIndex((r) => r.name === routeName);
          const active = tabIndex >= 0 && state.index === tabIndex;

          return (
            <TouchableOpacity
              key={id}
              onPress={() => navigation.navigate(routeName)}
              style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
              activeOpacity={0.7}
              accessibilityLabel={TAB_LABELS[id]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <TabIcon id={id} color={active ? "#0D7655" : "#a3a3a3"} active={active} />
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  color: active ? "#0D7655" : "#a3a3a3",
                }}
              >
                {TAB_LABELS[id]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace("/auth");
    } else if (session.role === "DOMESTIC_HELP") {
      router.replace("/(domestic)");
    }
  }, [session, isLoading]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="finances" />
      <Tabs.Screen name="employee" />
      <Tabs.Screen name="menus" />
      <Tabs.Screen name="savings" />
      <Tabs.Screen name="evidence" />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

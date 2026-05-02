import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/lib/contexts/session-context";

export default function Root() {
  const { session, isLoading } = useSession();
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.multiRemove(["noma-session", "noma-has-account"]).then(() => {
      setHasAccount(false);
    });
  }, []);

  if (isLoading || hasAccount === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F0EB" }}>
        <ActivityIndicator color="#1B4D3E" size="large" />
      </View>
    );
  }

  if (session) {
    if (session.role === "DOMESTIC_HELP") return <Redirect href="/(domestic)" />;
    return <Redirect href="/(app)" />;
  }

  if (hasAccount) return <Redirect href="/auth" />;
  return <Redirect href="/onboarding/welcome" />;
}

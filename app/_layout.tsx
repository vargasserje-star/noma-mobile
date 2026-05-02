import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NotificationsProvider } from "@/lib/contexts/notifications-context";
import { AvatarProvider } from "@/lib/contexts/avatar-context";
import { SessionProvider } from "@/lib/contexts/session-context";
import { FinancesProvider } from "@/lib/contexts/finances-context";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { OnboardingProvider } from "@/lib/contexts/onboarding-context";

// Inner component so it has access to all context providers
function AppBootstrap() {
  usePushNotifications();
  return (
    <>
      <StatusBar style="light" backgroundColor="#0D7655" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <OnboardingProvider>
          <NotificationsProvider>
            <AvatarProvider>
              <FinancesProvider>
                <AppBootstrap />
              </FinancesProvider>
            </AvatarProvider>
          </NotificationsProvider>
        </OnboardingProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

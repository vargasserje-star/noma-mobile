import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api/client";
import { useSession } from "@/lib/contexts/session-context";

export const PUSH_TOKEN_KEY = "noma-push-token";

// Show alert + play sound when a push arrives while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Create the default Android notification channel once
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "NOMA",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0D7655",
    sound: "default",
  });
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators / emulators can't receive push notifications
    console.log("[NOMA] Push notifications only work on physical devices.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[NOMA] Push notification permission denied.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId || projectId === "REEMPLAZA_CON_TU_EAS_PROJECT_ID") {
    console.warn("[NOMA] EAS projectId no configurado en app.json → push desactivado.");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.warn("[NOMA] Error obteniendo push token:", e);
    return null;
  }
}

export function usePushNotifications() {
  const { session } = useSession();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  // Register device and save token to backend when user is logged in
  useEffect(() => {
    if (!session) return;

    void (async () => {
      await ensureAndroidChannel();
      const token = await getExpoPushToken();
      if (!token) return;
      tokenRef.current = token;

      // Persist locally so logout can find and delete it
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      try {
        await apiFetch("/api/push-tokens", {
          method: "POST",
          token: session.token,
          body: JSON.stringify({
            token,
            platform: Platform.OS === "ios" ? "ios" : "android",
          }),
        });
      } catch {
        // Non-critical — token will be re-registered on next login
      }
    })();
  }, [session?.token]);

  // Handle tap on a notification when app is in background or closed
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data as Record<string, string> | null;
        const href = data?.href;
        if (href) {
          // Small delay to let the navigator mount
          setTimeout(() => router.push(href as never), 300);
        }
      },
    );
    return () => sub.remove();
  }, [router]);

  // Expose the token so session-context can delete it on logout
  return { pushToken: tokenRef };
}

import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/lib/contexts/session-context";

export default function DomesticLayout() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace("/auth");
    } else if (session.role !== "DOMESTIC_HELP") {
      router.replace("/(app)");
    }
  }, [session, isLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

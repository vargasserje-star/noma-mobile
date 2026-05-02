import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useNotifications, type AppNotification } from "@/lib/contexts/notifications-context";
import { useAvatar, AVATAR_HEADER } from "@/lib/contexts/avatar-context";

const LOGO_WHITE = require("@/assets/logo-white.png");

function BellGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.75a4.5 4.5 0 0 0-4.5 4.5v1.42c0 .94-.3 1.86-.84 2.63L5.1 14.5c-.54.77-.02 1.82.92 1.82h11.96c.94 0 1.46-1.05.92-1.82l-1.56-2.2a4.56 4.56 0 0 1-.84-2.63V8.25A4.5 4.5 0 0 0 12 3.75Z"
        stroke="white"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.75 18.32a2.25 2.25 0 0 0 4.5 0"
        stroke="white"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60_000)     return "Ahora mismo";
  if (diff < 3_600_000)  return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Hace ${Math.floor(diff / 3_600_000)}h`;
  return `Hace ${Math.floor(diff / 86_400_000)}d`;
}

function NotifIcon({ icon }: { icon?: AppNotification["icon"] }) {
  if (icon === "task") {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-[#0D7655]/10">
        <Text className="text-[#0D7655] text-xs">✓</Text>
      </View>
    );
  }
  if (icon === "payment") {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-violet-100">
        <Text className="text-violet-600 text-xs">💳</Text>
      </View>
    );
  }
  if (icon === "expense") {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-[#FF6A00]/10">
        <Text className="text-[#FF6A00] text-xs">$</Text>
      </View>
    );
  }
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
      <Text className="text-neutral-400 text-xs">ℹ</Text>
    </View>
  );
}

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-black/[0.06]">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-[#101111]">Notificaciones</Text>
            {unreadCount > 0 && (
              <View className="h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#0D7655] px-1.5">
                <Text className="text-[10px] font-bold text-white">{unreadCount}</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-3">
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text className="text-[11px] font-semibold text-[#0D7655]">Marcar leídas</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Text className="text-sm font-medium text-neutral-400">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#f7f4f0]">
              <Text className="text-2xl">🔔</Text>
            </View>
            <Text className="text-sm text-neutral-400">Sin notificaciones</Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            {notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => {
                  markRead(n.id);
                  onClose();
                  router.push(n.href as never);
                }}
                className={`flex-row items-start gap-3 px-4 py-3 border-b border-black/[0.04] ${!n.read ? "bg-[#0D7655]/[0.03]" : ""}`}
                activeOpacity={0.7}
              >
                <NotifIcon icon={n.icon} />
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-start justify-between gap-1">
                    <Text
                      className={`text-sm leading-snug flex-1 ${n.read ? "font-medium text-neutral-600" : "font-semibold text-[#101111]"}`}
                      numberOfLines={2}
                    >
                      {n.title}
                    </Text>
                    {!n.read && (
                      <View className="mt-1 h-2 w-2 rounded-full bg-[#0D7655]" />
                    )}
                  </View>
                  <Text className="mt-0.5 text-xs text-neutral-400" numberOfLines={1}>{n.body}</Text>
                  <Text className="mt-1 text-[10px] text-neutral-300">{timeAgo(n.timestamp)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={clearAll}
            className="border-t border-black/[0.05] py-4 items-center"
          >
            <Text className="text-[11px] font-medium text-neutral-400">Borrar todo</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

type AppHeaderProps = {
  viewerInitials: string;
};

export function AppHeader({ viewerInitials }: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const { selectedAvatar } = useAvatar();
  const [bellOpen, setBellOpen] = useState(false);

  return (
    <>
      <View
        className="bg-[#0D7655] z-40"
        style={{ paddingTop: insets.top }}
      >
        <View
          className="flex-row items-end justify-between"
          style={{ paddingHorizontal: 26, paddingBottom: 14, paddingTop: 14 }}
        >
          <Image
            source={LOGO_WHITE}
            className="w-auto"
            style={{ height: 62, width: 92 }}
            resizeMode="contain"
          />

          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View>
              <TouchableOpacity
                onPress={() => setBellOpen(true)}
                className="items-center justify-center rounded-full"
                style={{ width: 52, height: 52, backgroundColor: "rgba(255,255,255,0.14)" }}
                activeOpacity={0.7}
                accessibilityLabel="Ver notificaciones"
              >
                <BellGlyph />
              </TouchableOpacity>
              {unreadCount > 0 ? (
                <View
                  className="absolute rounded-full border-[2.5px] border-[#0D7655] bg-[#FF7A1A]"
                  style={{ right: -1, top: -1, width: 16, height: 16 }}
                  pointerEvents="none"
                />
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(app)/profile")}
              className="items-center justify-center overflow-hidden rounded-full"
              style={{
                width: 52,
                height: 52,
                borderWidth: 2,
                borderColor: "rgba(223,239,231,0.48)",
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
              activeOpacity={0.8}
              accessibilityLabel="Abrir perfil"
            >
              {selectedAvatar ? (
                <Image
                  source={AVATAR_HEADER[selectedAvatar]!}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>
                  {viewerInitials || "NA"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <NotificationsModal visible={bellOpen} onClose={() => setBellOpen(false)} />
    </>
  );
}

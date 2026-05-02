import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const AVATAR_COUNT = 16;

// In RN, images are require()'d — we map index to static requires
export const AVATAR_NOMA: Record<number, ReturnType<typeof require>> = {
  1:  require("@/assets/avatars/noma/1.png"),
  2:  require("@/assets/avatars/noma/2.png"),
  3:  require("@/assets/avatars/noma/3.png"),
  4:  require("@/assets/avatars/noma/4.png"),
  5:  require("@/assets/avatars/noma/5.png"),
  6:  require("@/assets/avatars/noma/6.png"),
  7:  require("@/assets/avatars/noma/7.png"),
  8:  require("@/assets/avatars/noma/8.png"),
  9:  require("@/assets/avatars/noma/9.png"),
  10: require("@/assets/avatars/noma/10.png"),
  11: require("@/assets/avatars/noma/11.png"),
  12: require("@/assets/avatars/noma/12.png"),
  13: require("@/assets/avatars/noma/13.png"),
  14: require("@/assets/avatars/noma/14.png"),
  15: require("@/assets/avatars/noma/15.png"),
  16: require("@/assets/avatars/noma/16.png"),
};

export const AVATAR_HEADER: Record<number, ReturnType<typeof require>> = {
  1:  require("@/assets/avatars/header/1.webp"),
  2:  require("@/assets/avatars/header/2.webp"),
  3:  require("@/assets/avatars/header/3.webp"),
  4:  require("@/assets/avatars/header/4.webp"),
  5:  require("@/assets/avatars/header/5.webp"),
  6:  require("@/assets/avatars/header/6.webp"),
  7:  require("@/assets/avatars/header/7.webp"),
  8:  require("@/assets/avatars/header/8.webp"),
  9:  require("@/assets/avatars/header/9.webp"),
  10: require("@/assets/avatars/header/10.webp"),
  11: require("@/assets/avatars/header/11.webp"),
  12: require("@/assets/avatars/header/12.webp"),
  13: require("@/assets/avatars/header/13.webp"),
  14: require("@/assets/avatars/header/14.webp"),
  15: require("@/assets/avatars/header/15.webp"),
  16: require("@/assets/avatars/header/16.webp"),
};

type AvatarCtx = {
  selectedAvatar: number | null;
  setSelectedAvatar: (n: number) => void;
};

const AvatarContext = createContext<AvatarCtx | null>(null);
const STORAGE_KEY = "noma-avatar";

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [selectedAvatar, setSelectedAvatarState] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) setSelectedAvatarState(Number(v));
    });
  }, []);

  const setSelectedAvatar = useCallback((n: number) => {
    setSelectedAvatarState(n);
    AsyncStorage.setItem(STORAGE_KEY, String(n));
  }, []);

  return (
    <AvatarContext.Provider value={{ selectedAvatar, setSelectedAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatar must be inside AvatarProvider");
  return ctx;
}

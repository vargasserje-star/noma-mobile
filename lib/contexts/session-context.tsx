import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AppRoleKey, HouseholdTypeKey } from "@/lib/access-control";

export type Session = {
  id: string;
  name: string;
  email: string;
  role: AppRoleKey;
  householdId: string;
  householdName: string;
  householdType: HouseholdTypeKey;
  token: string;
  canViewFinances?: boolean;
  hasEmployee?: boolean;
};

type SessionCtx = {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (draft: SignupDraft) => Promise<void>;
  logout: (pushToken?: string) => Promise<void>;
  updateSession: (patch: Partial<Session>) => Promise<void>;
  setDevRole: (role: AppRoleKey) => Promise<void>;
};

export type SignupDraft = {
  name: string;
  email: string;
  password: string;
  householdName: string;
  householdType: string;
  city: string;
  country: string;
  hasEmployee: boolean;
  role?: "OWNER" | "MEMBER" | "DOMESTIC_HELP";
};

const SessionContext = createContext<SessionCtx | null>(null);
const STORAGE_KEY = "noma-session";
const HAS_ACCOUNT_KEY = "noma-has-account";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setSession(JSON.parse(raw));
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ ok: boolean; error?: string; data?: { email: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Credenciales inválidas");
    const initial: Session = {
      id: "demo-owner-1",
      name: email.split("@")[0],
      email: res.data?.email ?? email,
      role: "OWNER",
      householdId: "demo-household-1",
      householdName: "Mi Hogar",
      householdType: "FAMILY",
      token: "",
    };
    await persist(initial);
    await AsyncStorage.setItem(HAS_ACCOUNT_KEY, "true");
    // Patch real name from dashboard
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: { viewer?: { name: string }; household?: { name: string } } }>(
        "/api/dashboard",
        { token: initial.token },
      );
      const dash = raw?.data ?? (raw as any);
      if (dash?.viewer?.name || dash?.household?.name) {
        const patched: Session = {
          ...initial,
          name: dash.viewer?.name || initial.name,
          householdName: dash.household?.name || initial.householdName,
        };
        await persist(patched);
      }
    } catch { /* silent — keep initial session */ }
  }, [persist]);

  const signup = useCallback(async (draft: SignupDraft) => {
    const res = await apiFetch<{ ok: boolean; error?: unknown; data?: { user: { id: string; email: string; name: string } } }>(
      "/api/auth/signup",
      { method: "POST", body: JSON.stringify(draft) },
    );
    if (!res.ok) throw new Error("Error al crear la cuenta");
    const initial: Session = {
      id: res.data?.user.id ?? "demo-owner-1",
      name: res.data?.user.name ?? draft.name,
      email: res.data?.user.email ?? draft.email,
      role: (draft.role ?? "OWNER") as AppRoleKey,
      householdId: "demo-household-1",
      householdName: draft.householdName,
      householdType: draft.householdType as HouseholdTypeKey,
      token: "",
      hasEmployee: draft.hasEmployee,
    };
    await persist(initial);
    await AsyncStorage.setItem(HAS_ACCOUNT_KEY, "true");
    // Patch real name from dashboard
    try {
      const raw = await apiFetch<{ ok?: boolean; data?: { viewer?: { name: string }; household?: { name: string } } }>(
        "/api/dashboard",
        { token: initial.token },
      );
      const dash = raw?.data ?? (raw as any);
      if (dash?.viewer?.name || dash?.household?.name) {
        const patched: Session = {
          ...initial,
          name: dash.viewer?.name || initial.name,
          householdName: dash.household?.name || initial.householdName,
        };
        await persist(patched);
      }
    } catch { /* silent — keep initial session */ }
  }, [persist]);

  const updateSession = useCallback(async (patch: Partial<Session>) => {
    if (!session) return;
    const updated: Session = { ...session, ...patch };
    await persist(updated);
  }, [session, persist]);

  const logout = useCallback(async (pushToken?: string) => {
    // Read the locally-stored push token if caller didn't provide one
    const tokenToDelete =
      pushToken ?? (await AsyncStorage.getItem("noma-push-token"));

    if (tokenToDelete && session?.token) {
      try {
        await apiFetch("/api/push-tokens", {
          method: "DELETE",
          token: session.token,
          body: JSON.stringify({ token: tokenToDelete }),
        });
        await AsyncStorage.removeItem("noma-push-token");
      } catch { /* non-critical */ }
    }
    await persist(null);
  }, [persist, session?.token]);

  const setDevRole = useCallback(async (role: AppRoleKey) => {
    if (!__DEV__ || !session) return;
    await persist({ ...session, role });
  }, [session, persist]);

  return (
    <SessionContext.Provider value={{ session, isLoading, login, signup, logout, updateSession, setDevRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
}

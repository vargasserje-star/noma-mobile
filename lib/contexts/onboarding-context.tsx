import { createContext, useContext, useState, type ReactNode } from "react";

export type OnboardingDraft = {
  email: string;
  password: string;
  role: "OWNER" | "MEMBER" | "DOMESTIC_HELP" | "";
  householdType: "FAMILY" | "COUPLE" | "ROOMMATES" | "SOLO" | "";
  hasEmployee: boolean;
  name: string;
  code: string;
  householdId: string;
  householdName: string;
};

const defaults: OnboardingDraft = {
  email: "",
  password: "",
  role: "",
  householdType: "",
  hasEmployee: false,
  name: "",
  code: "",
  householdId: "",
  householdName: "",
};

type Ctx = {
  draft: OnboardingDraft;
  set: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(defaults);
  const set = (patch: Partial<OnboardingDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));
  const reset = () => setDraft(defaults);
  return (
    <OnboardingContext.Provider value={{ draft, set, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be inside OnboardingProvider");
  return ctx;
}

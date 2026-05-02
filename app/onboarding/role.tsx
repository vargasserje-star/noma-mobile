import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { NomaLogo } from "@/lib/components/noma-logo";

type Role = "OWNER" | "MEMBER" | "DOMESTIC_HELP";

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ selected }: { selected: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={selected ? "rgba(255,255,255,0.5)" : "#B0A89E"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HouseIcon({ selected }: { selected: boolean }) {
  const circleBg = selected ? "rgba(255,255,255,0.18)" : "#E2EDE6";
  const opacity = selected ? 0.88 : 1;
  return (
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: circleBg, justifyContent: "center", alignItems: "center" }}>
      <Svg width={38} height={34} viewBox="0 0 424.12 380.73" opacity={opacity}>
        <Path fill="#fdf2e8" d="M364.96,192.77c7.13-11.85,5.55-22.26-1.24-33.87-41.89-39.35-81.65-83.25-123.4-122.42-.88-9.23,15.37-18.07,22.57-21.61,95.22-46.85,172.69,35.85,140.68,131.56-5.23,15.64-19.95,45.6-38.62,46.34Z"/>
        <Path fill="#042f23" d="M240.32,36.49c2.98,1.19,5.91,2.47,8.67,4.05s5.46,3.12,7.6,5.22c37.11,36.26,74.57,72.96,110.58,110.29,7.52,7.8,11.68,32.71-2.21,36.74-10.52,17.49-31.73,9.54-31.73,11.33v45.3c11.33-10.82,23.42-16.72,37.97-22.07,43.24-15.91,50.32-10.07,52.77,36.7,1.92,36.67-15.09,79.45-55.81,84.84-7.81,1.03-35.43-2.87-36.94-1.81-.74.52-3.77,12.32-7.04,16.75-6.57,8.9-17.59,13.79-28.26,14.79-71.59,6.72-153.79-5.04-226.51-.28-10.57,1.01-30.79-19.76-30.79-28.12v-146.1C19.07,206.76.74,200.37,0,177.98c-.73-22.37,40.59-51.76,55.68-66.69C91.01,76.36,125.69,40.83,162.12,7.02c11.24-8.01,25.29-8.9,38.06-4.04,6.16,2.34,33.27,27.06,40.14,33.5Z"/>
        <Path fill="#fdf8f3" d="M317.37,343.4c-1.06,6-10.54,19.25-17,19.25h-66.85v-103.06c0-1.51-6.46-14.49-8.08-16.84-21.46-31.25-72.13-26.73-85.31,9.57-.79,2.18-4.05,13.05-4.05,14.07v96.27h-66.85c-5.62,0-17-15.58-17-21.52v-155.16c-17.39,1.78-45.33,11.53-32.75-18.02,44.27-40.02,83.93-85.64,127.9-125.84,8.98-8.21,26.26-26.22,37.42-26.22,11.28,0,30.53,20.04,39.69,28.49,42.85,39.5,83.15,83.51,125.63,123.58,7.85,9.76,2.2,23.78-10.6,22.16-3.67-.46-22.15-10.41-22.15-3.01v156.29Z"/>
        <Path fill="#fc5f02" d="M219.93,362.65h-67.98v-103.06c0-8.71,17.15-20.24,25.34-22.22,18.29-4.42,42.64,9.84,42.64,29.02v96.27Z"/>
        <Path fill="#fcfbf8" d="M403.45,233.53c8.99,31.43,10.02,82.77-26.49,96.95-9.62,3.73-27.7,6.71-36.97,1.64-4.15-2.27-.27-3.71.96-5.9,6.2-10.93,19.84-25.85,29.67-33.78,5.64-4.54,17.98-5.87,17.15-14.69-1.03-10.95-13.7-3.55-18.96-.71-15.22,8.19-25.49,24.22-37.83,35.78,4.66-15.6-2.68-28.34,4.33-44.35,8.24-18.79,48.92-31.97,68.13-34.94Z"/>
      </Svg>
    </View>
  );
}

function PersonIcon({ selected }: { selected: boolean }) {
  const circleBg = selected ? "rgba(255,255,255,0.18)" : "#E2EDE6";
  const color = selected ? "rgba(255,255,255,0.92)" : "#1B4D3E";
  return (
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: circleBg, justifyContent: "center", alignItems: "center" }}>
      <Svg width={30} height={32} viewBox="0 0 30 32" fill="none">
        <Circle cx={15} cy={9} r={8} fill={color} />
        <Path d="M1 32C1 23.163 7.268 16 15 16C22.732 16 29 23.163 29 32Z" fill={color} />
      </Svg>
    </View>
  );
}

function BroomIcon({ selected }: { selected: boolean }) {
  const circleBg = selected ? "rgba(255,255,255,0.18)" : "#E2EDE6";
  const opacity = selected ? 0.88 : 1;
  return (
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: circleBg, justifyContent: "center", alignItems: "center" }}>
      <Svg width={30} height={34} viewBox="0 0 440.87 492.82" opacity={opacity}>
        <Path fill="#f56815" d="M67.76,243.96c-7.1,6.78-4.92,39.67-22.49,34.47-7.32-2.17-6.64-24.16-11.99-31.27-8.13-10.8-31.32-4.24-33.27-21.71,6.98-10.26,21.44-7.55,29.72-13.61,11.43-8.36,6.59-37.08,23.3-31.59,7.26,2.39,7.45,23.72,15.63,31.57,7.51,7.21,28.29,7.46,29.69,13.62,3.07,13.53-25.61,13.77-30.58,18.52Z"/>
        <Path fill="#f56815" d="M135.77,62.26c14.97-4.37,13.75,18.99,23.43,27.65,6.63,5.93,23.77,8.04,25.66,13.68,5.48,16.33-20.75,12.54-27.56,19.5-6.62,6.78-3.56,29.72-17.57,29.7-13.36-.02-8.35-24.25-19.42-31.9-8.26-5.71-19.42-.82-25.85-9.56-2.74-18.42,21.11-12.75,29.48-21.59,6.15-6.49,4.84-25.45,11.84-27.49Z"/>
        <Path fill="#f56815" d="M389.75,435.53c-.97-.8-1.65-18.25-6.1-23.42-5.32-6.19-22.72-4.92-25.04-8.39-11.64-17.4,12.72-14.45,20.74-19.49,12.3-7.74,6.25-29.8,23.94-27.12,9.22,25.22,9.47,20,28.36,30.64,27.05,15.23-13.58,19.39-18.88,25.95-4.31,5.34-2.67,17.06-7.22,20.3-2.93,2.09-14.13,2.92-15.81,1.54Z"/>
        <Path fill="#164b30" d="M105.04,429.06c-4.2-2.61-11.43-1.28-16.73-4.85-16.44-11.09-53.35-32.33-37.46-56.64,1.66-2.54,42.02-24.28,51.49-32.07,31.76-26.12,61.42-64.75,84.71-96.21,20.31-27.44,43.1-35.21,76.57-29.39L356.34,15.28c22.89-30.58,64.02-11.56,60.03,24.35l-92.05,199.25c-.92,10.64,38.33,25.91,21.15,76.11-13.36,39.02-18.98,80.63-32.66,120.69-17.16,50.24-25.5,68.48-81.72,50.22-13.51-4.39-11.93-4.35-27.23-7.8-24.11-5.44-28.59-16.96-38.39-20.6-3.96-1.47-11.6,2.28-19.88.16-19.12-4.9-29.5-21.74-40.55-28.6ZM377,14.78l-97.94,207.46,26.12,12.31L403.12,27.08l-26.12-12.31ZM326.56,313.83c6.6-25.61,5.7-40.67-16.91-55.79-29.49-19.71-94.88-52.95-105.04.71l121.95,55.07ZM314.13,330.18c-3.48-5.53-112.19-55.29-118.7-54.76-21.66,1.77-66,64.77-87.32,81.57-11.24,8.85-27.15,13.57-34.9,19.45-11.6,8.79,23,32.88,34.12,31.13,15.82-2.49,42.77-44.57,51.97-42.61,24.25,5.16-26.93,51.13-33.31,56.99,33.82,41.87,57.09-24.04,68.73-21.6,20.78,4.35-13.79,42.08-13.59,45.22,24.14,16.55,27.82,19.27,42.36-4.77,6.19-10.24,13.21-40.45,26.34-36.5,19.24,5.79-16.83,50.04-13.56,60.49s31.63,12.21,41.33,2.52c10.31-10.3,43.67-125.78,36.54-137.13Z"/>
      </Svg>
    </View>
  );
}

const ROLES: { id: Role; label: string }[] = [
  { id: "OWNER", label: "Voy a crear y administrar mi hogar" },
  { id: "MEMBER", label: "Me invitaron a unirme a un hogar" },
  { id: "DOMESTIC_HELP", label: "Soy empleada doméstica" },
];

function RoleIcon({ id, selected }: { id: Role; selected: boolean }) {
  if (id === "OWNER") return <HouseIcon selected={selected} />;
  if (id === "MEMBER") return <PersonIcon selected={selected} />;
  return <BroomIcon selected={selected} />;
}

function AnimatedRoleCard({
  role, isSelected, onPress, index,
}: {
  role: typeof ROLES[0];
  isSelected: boolean;
  onPress: () => void;
  index: number;
}) {

    return (
    <Animated.View entering={FadeIn.duration(300)}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.92}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: isSelected ? "#1B4D3E" : "white",
            borderRadius: 18,
            padding: 16,
            borderWidth: 2,
            borderColor: isSelected ? "#1B4D3E" : "#E8E3DC",
            shadowColor: "#000",
            shadowOpacity: isSelected ? 0.12 : 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: isSelected ? 3 : 1,
          }}
        >
          <RoleIcon id={role.id} selected={isSelected} />
          <Text style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "600",
            color: isSelected ? "white" : "#1A1A1A",
            lineHeight: 21,
          }}>
            {role.label}
          </Text>
          <ChevronIcon selected={isSelected} />
        </TouchableOpacity>
      </Animated.View>
  );
}

export default function RoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { set } = useOnboarding();
  const [selected, setSelected] = useState<Role | null>(null);

  function handleSelect(role: Role) {
    setSelected(role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleContinue() {
    if (!selected) return;
    set({ role: selected });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selected === "OWNER") {
      router.push("/onboarding/recognition");
    } else {
      router.push("/onboarding/code");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0EB" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + Logo */}
        <Animated.View
          entering={FadeIn.duration(300).delay(80)}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 40 }}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 16 }}>
            <BackIcon />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
            <NomaLogo />
          </View>
        </Animated.View>

        {/* Headline */}
        <Animated.Text
          entering={FadeIn.duration(300).delay(160)}
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: "#1B4D3E",
            letterSpacing: -0.8,
            marginBottom: 32,
            lineHeight: 38,
          }}
        >
          ¿Cómo vas a{"\n"}usar Noma?
        </Animated.Text>

        {/* Role cards */}
        <View style={{ gap: 12, flex: 1 }}>
          {ROLES.map((role, index) => (
            <AnimatedRoleCard
              key={role.id}
              role={role}
              isSelected={selected === role.id}
              onPress={() => handleSelect(role.id)}
              index={index}
            />
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeIn.duration(300).delay(240)}>
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.88}
            style={{
              marginTop: 36,
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: selected ? "#E8622A" : "#D5CFC8",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
              Continuar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

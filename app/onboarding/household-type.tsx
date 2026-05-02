import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { NomaLogo } from "@/lib/components/noma-logo";

type HouseholdType = "FAMILY" | "COUPLE" | "ROOMMATES" | "SOLO";

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#1B4D3E" />
      <Path d="M8 12l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EmptyCheck() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#D5CFC8" strokeWidth={2} />
    </Svg>
  );
}

const CIRCLE = {
  width: 52, height: 52, borderRadius: 26,
  backgroundColor: "#E2EDE6",
  justifyContent: "center" as const,
  alignItems: "center" as const,
};

function FamilyIcon() {
  return (
    <View style={CIRCLE}>
      <Svg width={38} height={34} viewBox="0 0 424.12 380.73">
        <Path fill="#fdf2e8" d="M364.96,192.77c7.13-11.85,5.55-22.26-1.24-33.87-41.89-39.35-81.65-83.25-123.4-122.42-.88-9.23,15.37-18.07,22.57-21.61,95.22-46.85,172.69,35.85,140.68,131.56-5.23,15.64-19.95,45.6-38.62,46.34Z"/>
        <Path fill="#042f23" d="M240.32,36.49c2.98,1.19,5.91,2.47,8.67,4.05s5.46,3.12,7.6,5.22c37.11,36.26,74.57,72.96,110.58,110.29,7.52,7.8,11.68,32.71-2.21,36.74-10.52,17.49-31.73,9.54-31.73,11.33v45.3c11.33-10.82,23.42-16.72,37.97-22.07,43.24-15.91,50.32-10.07,52.77,36.7,1.92,36.67-15.09,79.45-55.81,84.84-7.81,1.03-35.43-2.87-36.94-1.81-.74.52-3.77,12.32-7.04,16.75-6.57,8.9-17.59,13.79-28.26,14.79-71.59,6.72-153.79-5.04-226.51-.28-10.57,1.01-30.79-19.76-30.79-28.12v-146.1C19.07,206.76.74,200.37,0,177.98c-.73-22.37,40.59-51.76,55.68-66.69C91.01,76.36,125.69,40.83,162.12,7.02c11.24-8.01,25.29-8.9,38.06-4.04,6.16,2.34,33.27,27.06,40.14,33.5Z"/>
        <Path fill="#fdf8f3" d="M317.37,343.4c-1.06,6-10.54,19.25-17,19.25h-66.85v-103.06c0-1.51-6.46-14.49-8.08-16.84-21.46-31.25-72.13-26.73-85.31,9.57-.79,2.18-4.05,13.05-4.05,14.07v96.27h-66.85c-5.62,0-17-15.58-17-21.52v-155.16c-17.39,1.78-45.33,11.53-32.75-18.02,44.27-40.02,83.93-85.64,127.9-125.84,8.98-8.21,26.26-26.22,37.42-26.22,11.28,0,30.53,20.04,39.69,28.49,42.85,39.5,83.15,83.51,125.63,123.58,7.85,9.76,2.2,23.78-10.6,22.16-3.67-.46-22.15-10.41-22.15-3.01v156.29Z"/>
        <Path fill="#fc5f02" d="M219.93,362.65h-67.98v-103.06c0-8.71,17.15-20.24,25.34-22.22,18.29-4.42,42.64,9.84,42.64,29.02v96.27Z"/>
        <Path fill="#fcfbf8" d="M403.45,233.53c8.99,31.43,10.02,82.77-26.49,96.95-9.62,3.73-27.7,6.71-36.97,1.64-4.15-2.27-.27-3.71.96-5.9,6.2-10.93,19.84-25.85,29.67-33.78,5.64-4.54,17.98-5.87,17.15-14.69-1.03-10.95-13.7-3.55-18.96-.71-15.22,8.19-25.49,24.22-37.83,35.78,4.66-15.6-2.68-28.34,4.33-44.35,8.24-18.79,48.92-31.97,68.13-34.94Z"/>
      </Svg>
    </View>
  );
}

function CoupleIcon() {
  return (
    <View style={CIRCLE}>
      <Svg width={32} height={28} viewBox="0 0 32 28" fill="none">
        <Circle cx={9} cy={17} r={5} fill="#1B4D3E" />
        <Path d="M2 28 C2 22.5 5 18 9 18 C13 18 16 22.5 16 28Z" fill="#1B4D3E" />
        <Circle cx={23} cy={17} r={5} fill="#E8622A" />
        <Path d="M16 28 C16 22.5 19 18 23 18 C27 18 30 22.5 30 28Z" fill="#E8622A" />
        <Path d="M16 15 C16 15 12 11 12 8.5 C12 6.5 14 5 16 7.5 C18 5 20 6.5 20 8.5 C20 11 16 15 16 15 Z" fill="#1B4D3E" />
      </Svg>
    </View>
  );
}

function RoommatesIcon() {
  return (
    <View style={CIRCLE}>
      <Svg width={34} height={30} viewBox="0 0 34 30" fill="none">
        <Circle cx={9} cy={17} r={5} fill="#1B4D3E" />
        <Path d="M2 30 C2 24 5 20 9 20 C13 20 16 24 16 30Z" fill="#1B4D3E" />
        <Path d="M13 14 L17 5" stroke="#1B4D3E" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={25} cy={17} r={5} fill="#E8622A" />
        <Path d="M18 30 C18 24 21 20 25 20 C29 20 32 24 32 30Z" fill="#E8622A" />
        <Path d="M21 14 L17 5" stroke="#E8622A" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={17} cy={4} r={2.5} fill="#1B4D3E" />
      </Svg>
    </View>
  );
}

function SoloIcon() {
  return (
    <View style={CIRCLE}>
      <Svg width={28} height={30} viewBox="0 0 28 30" fill="none">
        <Circle cx={14} cy={9} r={8} fill="#1B4D3E" />
        <Path d="M1 30 C1 22 7 16 14 16 C21 16 27 22 27 30Z" fill="#1B4D3E" />
      </Svg>
    </View>
  );
}

const TYPES: { id: HouseholdType; label: string }[] = [
  { id: "FAMILY", label: "Familia con hijos" },
  { id: "COUPLE", label: "Pareja sin hijos" },
  { id: "ROOMMATES", label: "Roommates" },
  { id: "SOLO", label: "Vivo solo/a" },
];

function TypeIcon({ id }: { id: HouseholdType }) {
  if (id === "FAMILY") return <FamilyIcon />;
  if (id === "COUPLE") return <CoupleIcon />;
  if (id === "ROOMMATES") return <RoommatesIcon />;
  return <SoloIcon />;
}

function AnimatedTypeCard({
  type, isSelected, onPress, index,
}: {
  type: typeof TYPES[0];
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
            backgroundColor: "white",
            borderRadius: 16,
            padding: 14,
            borderWidth: 2,
            borderColor: isSelected ? "#1B4D3E" : "#E8E3DC",
          }}
        >
          <TypeIcon id={type.id} />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#1A1A1A" }}>
            {type.label}
          </Text>
          {isSelected ? <CheckIcon /> : <EmptyCheck />}
        </TouchableOpacity>
      </Animated.View>
  );
}

export default function HouseholdTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { set } = useOnboarding();
  const [householdType, setHouseholdType] = useState<HouseholdType | null>(null);
  const [hasEmployee, setHasEmployee] = useState<boolean | null>(null);

  function handleTypeSelect(type: HouseholdType) {
    setHouseholdType(type);
    setHasEmployee(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleContinue() {
    if (!householdType || hasEmployee === null) return;
    set({ householdType, hasEmployee });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/onboarding/confirmation");
  }

  const canContinue = householdType !== null && hasEmployee !== null;

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Back + Logo */}
        <Animated.View
          entering={FadeIn.duration(300).delay(80)}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 36 }}
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
          style={{ fontSize: 30, fontWeight: "800", color: "#1B4D3E", letterSpacing: -0.7, marginBottom: 4 }}
        >
          ¿Cómo es tu hogar?
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.duration(300).delay(240)}
          style={{ fontSize: 14, color: "#7C7C7C", marginBottom: 24 }}
        >
          Esto nos ayuda a personalizar tu experiencia.
        </Animated.Text>

        {/* Household type cards */}
        <View style={{ gap: 10, marginBottom: 28 }}>
          {TYPES.map((type, index) => (
            <AnimatedTypeCard
              key={type.id}
              type={type}
              isSelected={householdType === type.id}
              onPress={() => handleTypeSelect(type.id)}
              index={index}
            />
          ))}
        </View>

        {/* Employee question — animates in when a type is selected */}
        {householdType && (
          <Animated.View
            entering={FadeIn.duration(300).delay(320)}
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 20,
              borderWidth: 1.5,
              borderColor: "#E8E3DC",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1B4D3E", textAlign: "center", marginBottom: 4 }}>
              ¿Tienes empleada doméstica
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1B4D3E", textAlign: "center", marginBottom: 6 }}>
              o personal de apoyo en casa?
            </Text>
            <Text style={{ fontSize: 13, color: "#7C7C7C", textAlign: "center", marginBottom: 18 }}>
              Esto también nos ayuda a personalizar tu experiencia.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setHasEmployee(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.85}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  paddingVertical: 14, borderRadius: 14,
                  backgroundColor: hasEmployee === true ? "#1B4D3E" : "#F5F0EB",
                  borderWidth: 2, borderColor: hasEmployee === true ? "#1B4D3E" : "#E8E3DC",
                }}
              >
                {hasEmployee === true && (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
                <Text style={{ fontSize: 15, fontWeight: "700", color: hasEmployee === true ? "white" : "#5C5C5C" }}>Sí</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setHasEmployee(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.85}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  paddingVertical: 14, borderRadius: 14,
                  backgroundColor: hasEmployee === false ? "#5C5C5C" : "#F5F0EB",
                  borderWidth: 2, borderColor: hasEmployee === false ? "#5C5C5C" : "#E8E3DC",
                }}
              >
                {hasEmployee === false && (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
                <Text style={{ fontSize: 15, fontWeight: "700", color: hasEmployee === false ? "white" : "#5C5C5C" }}>No</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* CTA */}
        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.88}
            style={{
              marginTop: 24,
              borderRadius: 18,
              paddingVertical: 18,
              backgroundColor: canContinue ? "#E8622A" : "#D5CFC8",
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

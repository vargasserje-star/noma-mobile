import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import { NomaLogo } from "@/lib/components/noma-logo";

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === current ? "#1B4D3E" : "#D5CFC8",
          }}
        />
      ))}
    </View>
  );
}

type Feature = { icon: React.ReactNode; label: string };

function FeatureChip({ icon, label }: Feature) {
  return (
    <View style={{ alignItems: "center", gap: 8, flex: 1 }}>
      <View style={{
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: "#F0EDE8",
        justifyContent: "center",
        alignItems: "center",
      }}>
        {icon}
      </View>
      <Text style={{ fontSize: 11, color: "#5C5C5C", textAlign: "center", lineHeight: 15, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

function CheckIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M9 12l2 2 4-4" stroke="#1B4D3E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" stroke="#1B4D3E" strokeWidth={1.8} />
    </Svg>
  );
}

function EyeIconSmall() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} stroke="#1B4D3E" strokeWidth={1.8} />
    </Svg>
  );
}

function DocIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PeopleIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke="#1B4D3E" strokeWidth={1.8} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#1B4D3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function getCopy(householdType: string, hasEmployee: boolean): string {
  if (householdType === "FAMILY" && hasEmployee) {
    return "En casas con familia e hijos, una sola persona termina siendo el sistema operativo de todo. Noma va a cambiar eso: cada persona sabrá qué le toca, tú verás todo desde un solo lugar, y tu empleada tendrá instrucciones claras sin que tengas que repetirlas cada semana.";
  }
  if (householdType === "FAMILY" && !hasEmployee) {
    return "En casas con familia e hijos, una sola persona termina siendo el sistema operativo de todo. Noma va a cambiar eso: cada miembro del hogar va a saber qué le toca, los gastos van a tener orden y tú vas a poder ver cómo está tu casa sin tener que perseguir a nadie.";
  }
  if (householdType === "COUPLE" && hasEmployee) {
    return "En hogares de pareja, los conflictos no son por falta de amor. Son por falta de sistema. Noma les va a dar claridad sobre quién hace qué y tu empleada tendrá instrucciones claras sin que tengas que repetirlas cada semana.";
  }
  if (householdType === "COUPLE" && !hasEmployee) {
    return "En hogares de pareja, los conflictos no son por falta de amor. Son por falta de sistema. Noma les va a dar claridad sobre quién hace qué, cómo van los gastos y qué hay pendiente, sin que ninguno tenga que cargar con todo solo.";
  }
  if (householdType === "ROOMMATES") {
    return "Vivir con roommates funciona bien cuando hay claridad. El problema no es la convivencia, es que nadie sabe exactamente qué le toca, los gastos compartidos se vuelven incómodos y siempre termina siendo el mismo el que carga con todo. Noma le da a cada persona sus responsabilidades claras y los gastos visibles para todos.";
  }
  if (householdType === "SOLO" && hasEmployee) {
    return "Tener empleada doméstica debería darte tranquilidad, no más cosas de las que estar pendiente. Noma le da a tu empleada sus tareas del día con instrucciones claras, y a ti una vista en tiempo real de que todo está funcionando aunque no estés en casa.";
  }
  // SOLO without employee
  return "Vivir solo no significa que el hogar se gestione solo. Los pagos, las compras, las tareas recurrentes — todo depende de ti y de tu memoria. Noma te da un sistema para que nada se te escape y tu cabeza pueda descansar de cargar con la operación de tu propia casa.";
}

function getFeatures(householdType: string, hasEmployee: boolean): Feature[] {
  const base: Feature[] = [
    { icon: <CheckIcon />, label: "Cada persona sabe qué le toca" },
    { icon: <EyeIconSmall />, label: "Tú ves todo desde un solo lugar" },
  ];
  if (hasEmployee) {
    return [...base, { icon: <DocIcon />, label: "Instrucciones claras para tu empleada" }];
  }
  if (householdType === "ROOMMATES" || householdType === "FAMILY" || householdType === "COUPLE") {
    return [...base, { icon: <PeopleIcon />, label: "Todo pendiente en un solo lugar" }];
  }
  return base;
}

export default function ConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft } = useOnboarding();

  const copy = getCopy(draft.householdType, draft.hasEmployee);
  const features = getFeatures(draft.householdType, draft.hasEmployee);

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
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 36 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 16 }}>
            <BackIcon />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
            <NomaLogo />
          </View>
        </View>

        {/* Headline */}
        <Text style={{
          fontSize: 30,
          fontWeight: "800",
          color: "#1B4D3E",
          letterSpacing: -0.7,
          lineHeight: 36,
          marginBottom: 20,
        }}>
          Perfecto.{"\n"}Noma está hecho para{"\n"}hogares como el tuyo.
        </Text>

        {/* Personalized copy */}
        <Text style={{
          fontSize: 15,
          color: "#5C5C5C",
          lineHeight: 24,
          marginBottom: 36,
        }}>
          {copy}
        </Text>

        {/* Feature chips */}
        <View style={{
          flexDirection: "row",
          gap: 12,
          marginBottom: 36,
          paddingHorizontal: 4,
        }}>
          {features.map((f, i) => (
            <FeatureChip key={i} icon={f.icon} label={f.label} />
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Dots current={3} total={5} />

        {/* CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/onboarding/name");
          }}
          activeOpacity={0.88}
          style={{
            marginTop: 28,
            borderRadius: 18,
            paddingVertical: 18,
            backgroundColor: "#E8622A",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: "white", letterSpacing: -0.3 }}>
            Me interesa, seguir
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

import { Image } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoImg = require("@/assets/logo.png");

export function NomaLogo({ width = 120 }: { width?: number }) {
  // Logo aspect ratio: ~1440x860 → 1.674:1
  const height = Math.round(width / 1.674);
  return (
    <Image
      source={logoImg}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}

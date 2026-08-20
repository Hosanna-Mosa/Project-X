const primary = "#002045";
const primaryDark = "#1b365c";
const primaryLight = "#879fcb";
const teal = "#0061a5";
const tealDark = "#004578";
const cyan = "#aec7f5";

// New design-system tokens (from the "Design system foundations" spec).
// Kept separate from the legacy `Colors` export below so existing screens
// that read Colors[theme].xxx keep working untouched; new screens being
// rebuilt against the new mockups should import `designTokens` instead.
export type ServiceTokens = { accent: string; skin: string; on: string };
export type ThemeTokens = {
  bg: string;
  surface: string;
  sunken: string;
  border: string;
  borderStrong: string;
  text: string;
  sec: string;
  muted: string;
  success: string;
  successSkin: string;
  warning: string;
  warningSkin: string;
  error: string;
  errorSkin: string;
  veg: string;
  nonveg: string;
  services: {
    food: ServiceTokens;
    meat: ServiceTokens;
    ride: ServiceTokens;
    task: ServiceTokens;
    delivery: ServiceTokens;
  };
};

export const designTokens: { light: ThemeTokens; dark: ThemeTokens } = {
  light: {
    bg: "#F3F4F6",
    surface: "#FFFFFF",
    sunken: "#E7E9EC",
    border: "#DBDFE3",
    borderStrong: "#C3C9CF",
    text: "#12161A",
    sec: "#4A535B",
    muted: "#626B73",
    success: "#12704A",
    successSkin: "#E2F3EB",
    warning: "#8A5B00",
    warningSkin: "#F8EFDC",
    error: "#B32318",
    errorSkin: "#FBEAE8",
    veg: "#0F7A3C",
    nonveg: "#9B2620",
    services: {
      food: { accent: "#A84A0B", skin: "#FCF0E4", on: "#FFFFFF" },
      meat: { accent: "#8E2F4E", skin: "#FAE7EE", on: "#FFFFFF" },
      ride: { accent: "#0F5C79", skin: "#E2F1F7", on: "#FFFFFF" },
      task: { accent: "#57459E", skin: "#EDE9FB", on: "#FFFFFF" },
      delivery: { accent: "#4F6220", skin: "#EDF2DE", on: "#FFFFFF" },
    },
  },
  dark: {
    bg: "#0D1013",
    surface: "#161A1E",
    sunken: "#08090B",
    border: "#272D33",
    borderStrong: "#3A424A",
    text: "#F1F3F5",
    sec: "#A6B0B8",
    muted: "#8A939B",
    success: "#4FD495",
    successSkin: "#0C2A1D",
    warning: "#E9B44C",
    warningSkin: "#2E2209",
    error: "#FF8579",
    errorSkin: "#331512",
    veg: "#5FD68C",
    nonveg: "#FF8A80",
    services: {
      food: { accent: "#F49B4A", skin: "#33200F", on: "#0D1013" },
      meat: { accent: "#F08BAB", skin: "#331522", on: "#0D1013" },
      ride: { accent: "#4FC0E4", skin: "#0B2A38", on: "#0D1013" },
      task: { accent: "#A99BF7", skin: "#221B44", on: "#0D1013" },
      delivery: { accent: "#A9C95C", skin: "#232B10", on: "#0D1013" },
    },
  },
};

export default {
  light: {
    text: "#191c1e",
    textSecondary: "#43474e",
    textMuted: "#74777f",
    background: "#f7f9fb",
    surface: "#ffffff",
    surfaceSecondary: "#f2f4f6",
    border: "#c4c6cf",
    borderLight: "#e6e8ea",
    tint: primary,
    primary,
    primaryDark,
    primaryLight,
    teal,
    tealDark,
    cyan,
    success: "#0061a5",
    warning: "#F59E0B",
    error: "#ba1a1a",
    tabIconDefault: "#74777f",
    tabIconSelected: primary,
    shadow: "rgba(25, 28, 30, 0.06)",
    overlay: "rgba(25, 28, 30, 0.4)",
    cardGradientStart: "#002045",
    cardGradientEnd: "#1b365c",
  },
  dark: {
    text: "#eff1f3",
    textSecondary: "#c4c6cf",
    textMuted: "#74777f",
    background: "#191c1e",
    surface: "#2d3133",
    surfaceSecondary: "#30363c",
    border: "#43474e",
    borderLight: "#30363c",
    tint: "#aec7f5",
    primary: "#aec7f5",
    primaryDark: "#879fcb",
    primaryLight: "#1b365c",
    teal: "#73b5fe",
    tealDark: "#0061a5",
    cyan: "#73b5fe",
    success: "#73b5fe",
    warning: "#F59E0B",
    error: "#ffdad6",
    tabIconDefault: "#74777f",
    tabIconSelected: "#aec7f5",
    shadow: "rgba(0, 0, 0, 0.4)",
    overlay: "rgba(0, 0, 0, 0.7)",
    cardGradientStart: "#1b365c",
    cardGradientEnd: "#30363c",
  },
};


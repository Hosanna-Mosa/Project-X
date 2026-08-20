import { moderateScale } from "react-native-size-matters";

// Font families from the new design-system spec. Each RN <Text> needs an
// exact fontFamily per weight (these are static font files, not a single
// variable font), so pick the family by the weight you actually want.
// `heading` (Familjen Grotesk) is for display/headline text; `body`
// (Figtree) is for everything else — labels, paragraphs, buttons.
export const fontFamilies = {
  heading: {
    regular: "FamiljenGrotesk_400Regular",
    medium: "FamiljenGrotesk_500Medium",
    semibold: "FamiljenGrotesk_600SemiBold",
    bold: "FamiljenGrotesk_700Bold",
  },
  body: {
    regular: "Figtree_400Regular",
    medium: "Figtree_500Medium",
    semibold: "Figtree_600SemiBold",
    bold: "Figtree_700Bold",
  },
};

export const typography = {
  // Global size configurations
  sizes: {
    titleLarge: moderateScale(24),
    titleMedium: moderateScale(22),
    titleSmall: moderateScale(18),
    bodyLarge: moderateScale(16),
    bodyMedium: moderateScale(14),
    bodySmall: moderateScale(12),
    caption: moderateScale(10),
  },
  // Global font weight configurations
  weights: {
    black: "900" as const,
    extraBold: "800" as const,
    bold: "700" as const,
    semibold: "600" as const,
    medium: "500" as const,
    regular: "400" as const,
    light: "300" as const,
  },
  // Global semantic text styles (e.g. headings)
  heading1: {
    fontSize: moderateScale(24),
    fontWeight: "600" as const,
  },
  heading2: {
    fontSize: moderateScale(20),
    fontWeight: "700" as const,
  },
  heading3: {
    fontSize: moderateScale(16),
    fontWeight: "600" as const,
  },
  body: {
    fontSize: moderateScale(14),
    fontWeight: "400" as const,
  },
  bodySecondary: {
    fontSize: moderateScale(12),
    fontWeight: "400" as const,
  },
  buttonText: {
    fontSize: moderateScale(15),
    fontWeight: "700" as const,
  },
};

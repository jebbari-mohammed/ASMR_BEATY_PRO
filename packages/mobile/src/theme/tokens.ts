/**
 * Clean Beauty Editorial Design System Tokens.
 * Calm, premium, scientific, non-shaming, inclusive aesthetics.
 */

export const colors = {
  // Surfaces
  background: '#FBF9F5', // Warm alabaster
  surface: '#FFFFFF',    // Crisp card surface
  surfaceSecondary: '#F4F1EA', // Soft porcelain container
  surfaceElevated: '#FFFFFF',
  
  // Brand & Accents
  sage: '#7C8E72',       // Botanical calming sage
  sageLight: '#E8EDE5',  // Subtle sage tint for badges
  terracotta: '#C47862', // Warm earth tone for subtle highlights
  terracottaLight: '#F7ECE8',
  taupe: '#9E9287',
  taupeLight: '#F2EFEB',

  // Typography
  textPrimary: '#1C1B1A',   // Rich charcoal
  textSecondary: '#625F5B', // Warm muted slate
  textTertiary: '#96928C',  // Soft hint text
  textInverse: '#FFFFFF',

  // Semantic Status (Cosmetic & Friendly)
  calmFocus: '#4A6B82',     // Slate blue for focus metrics
  routineDone: '#5B8C67',   // Gentle forest green for completed steps
  routinePending: '#DDD7CD',
  caution: '#C48344',       // Warm amber for gentle sensitivity warnings
  border: '#E8E3DA',
  borderLight: '#F0ECE4',
  
  // Shadows
  cardShadow: 'rgba(28, 27, 26, 0.04)'
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 40
} as const;

export const typography = {
  // Heading styles (Editorial, elegant)
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    letterSpacing: -0.3
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: colors.textPrimary
  },
  
  // Body styles
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    color: colors.textSecondary
  },
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    color: colors.textTertiary
  },
  captionBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    color: colors.textSecondary
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.2
  }
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
} as const;

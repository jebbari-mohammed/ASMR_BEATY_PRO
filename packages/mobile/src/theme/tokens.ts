/**
 * ASMR BEAUTY PRO — Luxury Clean Beauty Design System Tokens
 * Bespoke, editorial, calm, scientific, $1M aesthetic.
 */

export const colors = {
  // Brand Signatures (Velvet Forest & Champagne Rose)
  primary: '#1A382B',           // Deep botanical velvet forest
  primaryLight: '#2D5643',      // Vibrant moss green
  primarySoft: '#EBF2EE',       // Calming botanical mist
  
  gold: '#C59A6F',              // Champagne gold accent
  goldLight: '#F7EFE8',         // Subtle warm champagne tint
  goldDark: '#99734D',
  
  terracotta: '#BA6D54',        // Warm sunlit clay
  terracottaLight: '#FAEDE8',
  
  // Surfaces & Glassmorphism
  background: '#F9F8F5',        // Pure silk warm alabaster
  backgroundSecondary: '#F3EFEA',
  surface: '#FFFFFF',           // Crisp pearl card surface
  surfaceTranslucent: 'rgba(255, 255, 255, 0.88)',
  surfaceSecondary: '#F5F2EB',  // Soft porcelain container
  surfaceElevated: '#FFFFFF',
  surfaceTwilight: '#131E18',   // Rich nocturnal green for PM routines
  surfaceTwilightCard: '#1C2B23',

  // Typography
  textPrimary: '#171615',       // Obsidian charcoal
  textSecondary: '#5E5B56',     // Warm editorial stone
  textTertiary: '#9C9891',      // Cashmere hint text
  textInverse: '#FFFFFF',
  textInverseMuted: '#C2C9C5',
  textGold: '#B08354',

  // Status & Routine Semantics
  routineDone: '#3E6B4F',       // Deep emerald check
  routineDoneBg: '#E9F2EC',
  routinePending: '#DDD7CE',
  caution: '#C47E3D',
  cautionBg: '#FCF3EB',
  
  // Borders & Dividers
  border: '#EAE5DC',
  borderLight: '#F2EEE7',
  borderGlass: 'rgba(255, 255, 255, 0.7)',
  borderDark: '#2C3D34',

  // Ambient Shadows
  cardShadow: 'rgba(24, 23, 22, 0.04)',
  glowEmerald: 'rgba(26, 56, 43, 0.12)',
  glowGold: 'rgba(197, 154, 111, 0.2)'
} as const;

export const gradients = {
  luxuryPrimary: ['#1A382B', '#11241B'] as const,
  champagneGlow: ['#FAF3EC', '#F4E7DC'] as const,
  botanicalMist: ['#F3F7F4', '#E6EFEA'] as const,
  eveningTwilight: ['#17261F', '#0E1713'] as const,
  goldButton: ['#D4A373', '#B88657'] as const,
  pearlCard: ['#FFFFFF', '#FAF9F6'] as const,
  scanLaser: ['rgba(197,154,111,0)', 'rgba(197,154,111,0.6)', 'rgba(197,154,111,0)'] as const
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 44
} as const;

export const typography = {
  // Eyebrow badge
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: colors.goldDark
  },
  
  // Hero Editorial Display
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    color: colors.textPrimary
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.textPrimary
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: colors.textPrimary
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary
  },

  // Metrics
  metricValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: colors.textPrimary
  },

  // Body
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as const,
    color: colors.textSecondary
  },
  bodyBold: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600' as const,
    color: colors.textPrimary
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: colors.textTertiary
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary
  },
  button: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.3
  }
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  full: 9999
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#171615',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  card: {
    shadowColor: '#1A382B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4
  },
  floating: {
    shadowColor: '#10221A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8
  }
} as const;

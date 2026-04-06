// NovaTheme.js — Global theme, colors, typography, spacing
// Import this in any screen: import { colors, fonts, spacing, shadows } from './NovaTheme';

export const colors = {
  // Base
  bg:           '#0a0a1a',
  bgCard:       '#1a1a2e',
  bgDeep:       '#0f0f23',
  bgInput:      '#1a1a2e',
  border:       '#2a2a4e',
  borderLight:  '#3a3a5e',

  // Brand
  primary:      '#6c63ff',
  primaryLight: '#a78bfa',
  primaryFade:  '#2a1a4e',

  // Semantic
  success:      '#69f0ae',
  successFade:  '#0a2a0a',
  danger:       '#ff5252',
  dangerFade:   '#2a0a0a',
  warning:      '#ffa726',
  warningFade:  '#1a1500',
  info:         '#29b6f6',

  // Text
  textPrimary:  '#ffffff',
  textSecondary:'#cccccc',
  textMuted:    '#888888',
  textDim:      '#555555',

  // Chart / Category palette
  palette: ['#6c63ff','#ef5350','#ffa726','#29b6f6','#66bb6a','#ab47bc','#ff7043','#ec407a','#26c6da','#8d6e63'],
};

export const fonts = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 15,
  lg:   17,
  xl:   20,
  xxl:  24,
  hero: 32,
  bold: 'bold',
  semibold: '600',
  normal: 'normal',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  section: 32,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

export const shadows = {
  card: {
    shadowColor: '#6c63ff',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fab: {
    shadowColor: '#6c63ff',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
};

// Reusable style blocks
export const baseStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fonts.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: fonts.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.primary,
    fontWeight: fonts.bold,
    fontSize: fonts.base,
    marginBottom: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    ...shadows.fab,
  },
  fabText: {
    color: colors.textPrimary,
    fontWeight: fonts.bold,
    fontSize: fonts.base,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgDeep,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xxl,
    ...shadows.modal,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fonts.lg,
    fontWeight: fonts.bold,
    marginBottom: spacing.lg,
  },
  btnPrimary: {
    flex: 1,
    padding: spacing.md + 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: colors.textPrimary,
    fontWeight: fonts.bold,
    fontSize: fonts.base,
  },
  btnSecondary: {
    flex: 1,
    padding: spacing.md + 2,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: colors.textMuted,
    fontSize: fonts.base,
  },
  progressBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    marginVertical: spacing.sm,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.bgCard,
  },
  headerTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.bold,
    color: colors.primary,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: fonts.sm,
    marginTop: 2,
  },
};

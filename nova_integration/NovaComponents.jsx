// NovaComponents.jsx — Shared UI components used across all screens
// Import: import { NovaCard, NovaButton, NovaBadge, NovaProgressBar, ... } from './NovaComponents';

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Animated, Modal, ScrollView
} from 'react-native';
import { colors, fonts, spacing, radius, shadows, baseStyles } from './NovaTheme';

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function NovaCard({ children, style, danger, success, warning, onPress }) {
  const borderColor = danger ? colors.danger : success ? colors.success : warning ? colors.warning : 'transparent';
  const borderWidth = (danger || success || warning) ? 1 : 0;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={[styles.card, { borderColor, borderWidth }, style]}>
      {children}
    </Wrapper>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export function NovaButton({ label, onPress, variant = 'primary', icon, disabled, loading, style }) {
  const variants = {
    primary:   { bg: colors.primary,     text: '#fff' },
    secondary: { bg: colors.bgCard,      text: colors.textMuted },
    danger:    { bg: colors.danger,      text: '#fff' },
    success:   { bg: colors.success,     text: '#000' },
    outline:   { bg: 'transparent',      text: colors.primary, border: colors.primary },
    ghost:     { bg: 'transparent',      text: colors.primaryLight },
  };
  const v = variants[variant] || variants.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1.5 : 0, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.btnText, { color: v.text }]}>{icon ? `${icon} ` : ''}{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── ICON BUTTON ──────────────────────────────────────────────────────────────
export function NovaIconButton({ icon, onPress, color = colors.primary, size = 36 }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.iconBtn, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.45 }}>{icon}</Text>
    </TouchableOpacity>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
export function NovaBadge({ label, color = colors.primary, textColor = '#fff', size = 'md' }) {
  const sizes = { sm: { px: 8, py: 3, fs: 10 }, md: { px: 12, py: 5, fs: 12 }, lg: { px: 16, py: 7, fs: 14 } };
  const s = sizes[size] || sizes.md;
  return (
    <View style={[styles.badge, { backgroundColor: color + '33', paddingHorizontal: s.px, paddingVertical: s.py }]}>
      <Text style={[styles.badgeText, { color: color, fontSize: s.fs }]}>{label}</Text>
    </View>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export function NovaProgressBar({ value, max, color, height = 6, animated = true }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  const barColor = color || (pct >= 100 ? colors.danger : pct >= 80 ? colors.warning : colors.success);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
    }
  }, [pct]);

  return (
    <View style={[styles.progressBg, { height }]}>
      {animated ? (
        <Animated.View style={[styles.progressFill, { height, backgroundColor: barColor, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      ) : (
        <View style={[styles.progressFill, { height, backgroundColor: barColor, width: `${pct}%` }]} />
      )}
    </View>
  );
}

// ─── STAT TILE ────────────────────────────────────────────────────────────────
export function NovaStatTile({ label, value, subValue, valueColor, icon, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={styles.statTile}>
      {icon && <Text style={styles.statIcon}>{icon}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor && { color: valueColor }]}>{value}</Text>
      {subValue && <Text style={styles.statSub}>{subValue}</Text>}
    </Wrapper>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function NovaSectionHeader({ title, action, actionLabel }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && <TouchableOpacity onPress={action}><Text style={styles.sectionAction}>{actionLabel || 'See all'}</Text></TouchableOpacity>}
    </View>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export function NovaInput({ label, placeholder, value, onChangeText, keyboardType, multiline, icon, style, ...props }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, style]}>
        {icon && <Text style={styles.inputIcon}>{icon}</Text>}
        <TextInput
          style={[styles.input, icon && { paddingLeft: 40 }, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          {...props}
        />
      </View>
    </View>
  );
}

// ─── CHIP SELECT ──────────────────────────────────────────────────────────────
export function NovaChipSelect({ options, selected, onSelect, color = colors.primary, scroll = false }) {
  const chips = options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const lbl = typeof opt === 'string' ? opt : opt.label;
    const active = selected === val;
    return (
      <TouchableOpacity key={val} onPress={() => onSelect(val)}
        style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
        <Text style={[styles.chipText, active && { color: '#fff' }]}>{lbl}</Text>
      </TouchableOpacity>
    );
  });

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={styles.chipWrap}>{chips}</View>;
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function NovaEmptyState({ emoji = '📭', title, subtitle, action, actionLabel }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      {title && <Text style={styles.emptyTitle}>{title}</Text>}
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={styles.emptyBtn} onPress={action}>
          <Text style={styles.emptyBtnText}>{actionLabel || 'Get Started'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
export function NovaLoader({ message = 'Loading...' }) {
  return (
    <View style={styles.loaderWrap}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.loaderText}>{message}</Text>
    </View>
  );
}

// ─── BOTTOM SHEET MODAL ───────────────────────────────────────────────────────
export function NovaBottomSheet({ visible, onClose, title, children, scrollable = true }) {
  const Content = scrollable ? ScrollView : View;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          {title && <Text style={styles.modalTitle}>{title}</Text>}
          <Content keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </Content>
        </View>
      </View>
    </Modal>
  );
}

// ─── AI RESULT MODAL ──────────────────────────────────────────────────────────
export function NovaAIModal({ visible, onClose, title = '⚡ Nova AI', loading, content }) {
  return (
    <NovaBottomSheet visible={visible} onClose={onClose} title={title}>
      {loading ? (
        <NovaLoader message="Nova is thinking..." />
      ) : (
        <ScrollView style={{ maxHeight: 400 }}>
          <Text style={styles.aiText}>{content}</Text>
        </ScrollView>
      )}
      <NovaButton label="Got it" onPress={onClose} style={{ marginTop: spacing.lg }} />
    </NovaBottomSheet>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
export function NovaHeader({ title, subtitle, right }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.headerRight}>{right}</View>}
    </View>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────
export function NovaTabBar({ tabs, active, onSelect }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const isActive = active === id;
        return (
          <TouchableOpacity key={id} style={[styles.tab, isActive && styles.tabActive]} onPress={() => onSelect(id)}>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── DIVIDER ─────────────────────────────────────────────────────────────────
export function NovaDivider({ style }) {
  return <View style={[styles.divider, style]} />;
}

// ─── WARNING BANNER ───────────────────────────────────────────────────────────
export function NovaWarningBanner({ message, type = 'warning' }) {
  const typeConfig = {
    warning: { bg: colors.warningFade, border: colors.warning, text: colors.warning },
    danger:  { bg: colors.dangerFade,  border: colors.danger,  text: colors.danger  },
    info:    { bg: '#0a1a2a',          border: colors.info,    text: colors.info    },
    success: { bg: colors.successFade, border: colors.success, text: colors.success },
  };
  const c = typeConfig[type] || typeConfig.warning;
  return (
    <View style={[styles.warningBanner, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.warningText, { color: c.text }]}>{message}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  btn: { padding: spacing.md + 2, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  btnText: { fontWeight: fonts.bold, fontSize: fonts.base },
  iconBtn: { backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: radius.full, alignSelf: 'flex-start' },
  badgeText: { fontWeight: fonts.bold },
  progressBg: { width: '100%', backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { borderRadius: radius.full },
  statTile: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statLabel: { color: colors.textMuted, fontSize: fonts.xs, marginBottom: 4, textAlign: 'center' },
  statValue: { color: colors.textPrimary, fontSize: fonts.xl, fontWeight: fonts.bold },
  statSub: { color: colors.textDim, fontSize: fonts.xs, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: colors.primary, fontWeight: fonts.bold, fontSize: fonts.base },
  sectionAction: { color: colors.primaryLight, fontSize: fonts.sm },
  inputLabel: { color: colors.textMuted, fontSize: fonts.sm, marginBottom: spacing.xs },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: 12, fontSize: 18, zIndex: 1 },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: fonts.md, borderWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, marginBottom: spacing.sm },
  chipText: { color: colors.textMuted, fontSize: fonts.sm },
  chipRow: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.section },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { color: colors.textPrimary, fontSize: fonts.lg, fontWeight: fonts.bold, textAlign: 'center', marginBottom: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: fonts.md, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md },
  emptyBtnText: { color: '#fff', fontWeight: fonts.bold },
  loaderWrap: { alignItems: 'center', padding: spacing.section },
  loaderText: { color: colors.primary, marginTop: spacing.md, fontSize: fonts.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bgDeep, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xxl, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: fonts.lg, fontWeight: fonts.bold, marginBottom: spacing.lg },
  aiText: { color: colors.textSecondary, lineHeight: 24, fontSize: fonts.md },
  header: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.bgCard, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: fonts.xl, fontWeight: fonts.bold, color: colors.primary },
  headerSub: { color: colors.textMuted, fontSize: fonts.sm, marginTop: 2 },
  headerRight: { position: 'absolute', right: spacing.lg },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.bgCard },
  tab: { flex: 1, padding: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: fonts.sm },
  tabTextActive: { color: colors.primary, fontWeight: fonts.bold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  warningBanner: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1 },
  warningText: { fontSize: fonts.sm, lineHeight: 20 },
});

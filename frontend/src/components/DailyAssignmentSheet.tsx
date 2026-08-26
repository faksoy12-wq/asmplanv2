import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Physician } from '@/src/lib/api';
import { getOfficialHoliday } from '@/src/lib/holidays';
import { colors, radius, spacing, TR_MONTHS, TR_WEEKDAYS_LONG } from '@/src/lib/theme';

type Props = {
  visible: boolean;
  date: string | null;
  physicians: Physician[];
  assignedIds: string[];
  isOverrideHoliday: boolean;
  onClose: () => void;
  onSave: (params: {
    date: string;
    isHoliday: boolean;
    physicianIds: string[];
  }) => Promise<void>;
};

export function DailyAssignmentSheet({
  visible,
  date,
  physicians,
  assignedIds,
  isOverrideHoliday,
  onClose,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<string[]>(assignedIds);
  const [holiday, setHoliday] = useState<boolean>(isOverrideHoliday);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(assignedIds);
    setHoliday(isOverrideHoliday);
  }, [assignedIds, isOverrideHoliday, date]);

  if (!date) return null;

  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  const dateObj = new Date(y, m - 1, d);
  const dow = (dateObj.getDay() + 6) % 7; // Mon=0
  const official = getOfficialHoliday(date);
  const isOfficialHoliday = !!official;
  const effectiveHoliday = isOfficialHoliday || holiday;
  const nice = `${d} ${TR_MONTHS[m - 1]} ${TR_WEEKDAYS_LONG[dow]}`;

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        date,
        isHoliday: holiday,
        physicianIds: effectiveHoliday ? [] : selected,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const showCoverageWarning = !effectiveHoliday && selected.length < 2 && physicians.length >= 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="day-sheet-backdrop" />
      <View style={styles.sheet} testID="day-sheet">
        <SafeAreaView edges={['bottom']} style={{ flex: 0 }}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateTitle} testID="day-sheet-date">{nice}</Text>
              {isOfficialHoliday && (
                <Text style={styles.holidayLabel}>Resmi Tatil · {official?.name}</Text>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} testID="day-sheet-close">
              <Ionicons name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingBottom: spacing.md }}>
            <View style={styles.holidayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>İdari İzin (ASM Kapalı)</Text>
                <Text style={styles.rowSub}>
                  Bu gün kapalı olarak işaretlensin. Atamalar temizlenir.
                </Text>
              </View>
              <Switch
                value={holiday}
                onValueChange={setHoliday}
                disabled={isOfficialHoliday}
                trackColor={{ false: colors.surfaceTertiary, true: colors.brandPrimary }}
                thumbColor={colors.surface}
                testID="day-sheet-holiday-switch"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nöbetçi Hekimler</Text>

              {physicians.length === 0 && (
                <Text style={styles.empty}>
                  Henüz hekim eklenmedi. Hekimler sekmesinden ekleyebilirsiniz.
                </Text>
              )}

              {physicians.map((p) => {
                const isOn = selected.includes(p.id);
                const disabled = effectiveHoliday;
                return (
                  <Pressable
                    key={p.id}
                    disabled={disabled}
                    onPress={() => toggle(p.id)}
                    style={[styles.physRow, disabled && { opacity: 0.4 }]}
                    testID={`day-sheet-phys-${p.code}`}
                  >
                    <View style={[styles.dot, { backgroundColor: p.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.physName}>{p.name}</Text>
                      <Text style={styles.physCode}>{p.code}</Text>
                    </View>
                    <View style={[styles.check, isOn && styles.checkOn]}>
                      {isOn && <Ionicons name="checkmark" size={16} color={colors.onBrandPrimary} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {showCoverageWarning && (
              <View style={styles.warn}>
                <Ionicons name="warning-outline" size={16} color={colors.error} />
                <Text style={styles.warnText}>
                  Eksik kapsama: en az 2 hekim atanması önerilir.
                </Text>
              </View>
            )}
          </ScrollView>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            testID="day-sheet-save"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  holidayLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  rowSub: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  section: { paddingTop: spacing.md },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  physRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
  },
  physName: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  physCode: { fontSize: 12, color: colors.muted, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  warn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorTint,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  warnText: { color: colors.error, fontSize: 13, fontWeight: '600', flex: 1 },
  saveBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  saveBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: '700' },
});

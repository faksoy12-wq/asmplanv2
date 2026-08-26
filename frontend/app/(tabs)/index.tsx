import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailyAssignmentSheet } from '@/src/components/DailyAssignmentSheet';
import {
  assignmentApi,
  holidayApi,
  physicianApi,
  templateApi,
  type Assignment,
  type HolidayOverride,
  type Physician,
  type Template,
} from '@/src/lib/api';
import { getOfficialHoliday } from '@/src/lib/holidays';
import { colors, radius, spacing, TR_MONTHS, TR_WEEKDAYS_SHORT } from '@/src/lib/theme';

const MIN_YEAR = 2026;
const MAX_YEAR = 2027;

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonthMondayIdx(year: number, month: number) {
  // JS getDay: 0=Sun..6=Sat. We want Mon=0..Sun=6.
  const d = new Date(year, month - 1, 1).getDay();
  return (d + 6) % 7;
}

export default function CalendarScreen() {
  const now = new Date();
  const initialYear = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);
  const initialMonth = initialYear === now.getFullYear() ? now.getMonth() + 1 : 1;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [overrides, setOverrides] = useState<Record<string, HolidayOverride>>({});
  const [template, setTemplate] = useState<Template>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ph, tpl, asg, ovr] = await Promise.all([
        physicianApi.list(),
        templateApi.get(),
        assignmentApi.list(year, month),
        holidayApi.list(year, month),
      ]);
      setPhysicians(ph);
      setTemplate(tpl.template || {});
      setAssignments(Object.fromEntries(asg.map((a) => [a.date, a.physician_ids])));
      setOverrides(Object.fromEntries(ovr.map((o) => [o.date, o])));
    } catch (e) {
      console.log('load error', e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, [loadAll]));

  const physiciansById = useMemo(
    () => Object.fromEntries(physicians.map((p) => [p.id, p])),
    [physicians],
  );

  const dim = daysInMonth(year, month);
  const startPad = firstDayOfMonthMondayIdx(year, month);

  const nav = (dir: -1 | 1) => {
    let ny = year;
    let nm = month + dir;
    if (nm < 1) { nm = 12; ny -= 1; }
    if (nm > 12) { nm = 1; ny += 1; }
    if (ny < MIN_YEAR || ny > MAX_YEAR) return;
    setYear(ny);
    setMonth(nm);
  };

  const isHoliday = (dateStr: string) => {
    if (getOfficialHoliday(dateStr)) return true;
    if (overrides[dateStr]?.is_holiday) return true;
    return false;
  };

  const applyTemplate = async () => {
    setApplying(true);
    try {
      const items: Assignment[] = [];
      for (let d = 1; d <= dim; d++) {
        const dateStr = toDateStr(year, month, d);
        if (isHoliday(dateStr)) continue;
        const dow = ((new Date(year, month - 1, d).getDay() + 6) % 7) + 1; // 1..7 Mon..Sun
        const ids = template[String(dow)] || [];
        items.push({ date: dateStr, physician_ids: ids });
      }
      if (items.length) await assignmentApi.bulk(items);
      await loadAll();
    } catch (e) {
      console.log('apply err', e);
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async ({
    date,
    isHoliday: h,
    physicianIds,
  }: { date: string; isHoliday: boolean; physicianIds: string[] }) => {
    if (h) {
      await holidayApi.put(date, true, 'İdari İzin');
    } else if (overrides[date]?.is_holiday) {
      await holidayApi.put(date, false);
    }
    if (!h && !getOfficialHoliday(date)) {
      await assignmentApi.put(date, physicianIds);
    }
    await loadAll();
  };

  const canPrev = !(year === MIN_YEAR && month === 1);
  const canNext = !(year === MAX_YEAR && month === 12);

  // Grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.h1}>Aylık Çalışma Çizelgesi</Text>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => nav(-1)}
            disabled={!canPrev}
            style={[styles.navBtn, !canPrev && { opacity: 0.35 }]}
            testID="cal-prev"
          >
            <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.monthLabel} testID="cal-month-label">
            {TR_MONTHS[month - 1]} {year}
          </Text>
          <Pressable
            onPress={() => nav(1)}
            disabled={!canNext}
            style={[styles.navBtn, !canNext && { opacity: 0.35 }]}
            testID="cal-next"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
        <View style={styles.dowRow}>
          {TR_WEEKDAYS_SHORT.map((w, i) => (
            <Text
              key={w}
              style={[styles.dow, (i === 5 || i === 6) && { color: colors.onSurfaceSecondary }]}
            >
              {w}
            </Text>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : (
          <View style={styles.grid}>
            {cells.map((d, idx) => {
              if (d === null) {
                return <View key={idx} style={[styles.cell, styles.cellEmpty]} />;
              }
              const dateStr = toDateStr(year, month, d);
              const off = getOfficialHoliday(dateStr);
              const holidayOver = overrides[dateStr]?.is_holiday;
              const holiday = !!off || !!holidayOver;
              const ids = assignments[dateStr] || [];
              const inMonthDow = (idx % 7); // 0=Mon..6=Sun
              const isWeekend = inMonthDow === 5 || inMonthDow === 6;
              return (
                <Pressable
                  key={idx}
                  onPress={() => setOpenDate(dateStr)}
                  style={[
                    styles.cell,
                    holiday && styles.cellHoliday,
                    !holiday && isWeekend && styles.cellWeekend,
                  ]}
                  testID={`day-${dateStr}`}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      holiday && { color: colors.error },
                    ]}
                  >
                    {d}
                  </Text>
                  {holiday ? (
                    <Text style={styles.tatilLabel} numberOfLines={2}>
                      {off ? 'Resmi Tatil' : 'İdari İzin'}
                    </Text>
                  ) : (
                    <View style={styles.dotRow}>
                      {ids.slice(0, 4).map((id) => {
                        const p = physiciansById[id];
                        if (!p) return null;
                        return (
                          <View
                            key={id}
                            style={[styles.tagDot, { backgroundColor: p.color }]}
                          />
                        );
                      })}
                      {ids.length > 4 && (
                        <Text style={styles.plus}>+{ids.length - 4}</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.creditFooter}>Yazılım ve Geliştirme: Dr. Furkan Aksoy</Text>
      </ScrollView>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={applyTemplate}
          disabled={applying || loading}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
          testID="apply-template"
        >
          <Ionicons name="flash" size={16} color={colors.onBrandPrimary} />
          <Text style={styles.fabText}>
            {applying ? 'Uygulanıyor…' : 'Şablonu Ay Geneline Uygula'}
          </Text>
        </Pressable>
      </View>

      <DailyAssignmentSheet
        visible={!!openDate}
        date={openDate}
        physicians={physicians}
        assignedIds={openDate ? assignments[openDate] || [] : []}
        isOverrideHoliday={openDate ? !!overrides[openDate]?.is_holiday : false}
        onClose={() => setOpenDate(null)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  h1: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.4,
    marginTop: spacing.sm,
  },
  monthRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  dowRow: { flexDirection: 'row', marginTop: spacing.md },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  loading: { padding: spacing.xxxl, alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.78,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  cellEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  cellHoliday: {
    backgroundColor: colors.errorTint,
    borderColor: colors.errorTint,
  },
  cellWeekend: {
    backgroundColor: colors.surfaceSecondary,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tatilLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.2,
  },
  dotRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    alignItems: 'center',
  },
  tagDot: { width: 8, height: 8, borderRadius: 999 },
  plus: { fontSize: 9, color: colors.muted, fontWeight: '700' },
  creditFooter: {
    marginTop: spacing.xl,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    color: colors.onBrandPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

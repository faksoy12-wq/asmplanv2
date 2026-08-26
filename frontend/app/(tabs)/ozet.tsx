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

import {
  assignmentApi,
  holidayApi,
  physicianApi,
  type Assignment,
  type HolidayOverride,
  type Physician,
} from '@/src/lib/api';
import { getHolidaysForMonth } from '@/src/lib/holidays';
import { colors, radius, spacing, TR_MONTHS } from '@/src/lib/theme';

const MIN_YEAR = 2026;
const MAX_YEAR = 2027;

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export default function OzetScreen() {
  const now = new Date();
  const initY = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);
  const initM = initY === now.getFullYear() ? now.getMonth() + 1 : 1;

  const [year, setYear] = useState(initY);
  const [month, setMonth] = useState(initM);
  const [phys, setPhys] = useState<Physician[]>([]);
  const [asg, setAsg] = useState<Assignment[]>([]);
  const [ovr, setOvr] = useState<HolidayOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, o] = await Promise.all([
        physicianApi.list(),
        assignmentApi.list(year, month),
        holidayApi.list(year, month),
      ]);
      setPhys(p);
      setAsg(a);
      setOvr(o);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nav = (d: -1 | 1) => {
    let ny = year;
    let nm = month + d;
    if (nm < 1) { nm = 12; ny -= 1; }
    if (nm > 12) { nm = 1; ny += 1; }
    if (ny < MIN_YEAR || ny > MAX_YEAR) return;
    setYear(ny);
    setMonth(nm);
  };

  const { counts, workingDays, official, overrideCount } = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of asg) {
      for (const id of a.physician_ids) {
        c[id] = (c[id] || 0) + 1;
      }
    }
    const off = getHolidaysForMonth(year, month);
    const overrideDates = new Set(ovr.filter((o) => o.is_holiday).map((o) => o.date));
    const officialDates = new Set(off.map((h) => h.date));
    const total = daysInMonth(year, month);
    let working = 0;
    for (let d = 1; d <= total; d++) {
      const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (officialDates.has(ds) || overrideDates.has(ds)) continue;
      working += 1;
    }
    return {
      counts: c,
      workingDays: working,
      official: off.length,
      overrideCount: overrideDates.size,
    };
  }, [asg, ovr, year, month]);

  const maxCount = Math.max(1, ...Object.values(counts));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const avg = phys.length > 0 ? Math.round((total / phys.length) * 10) / 10 : 0;

  const canPrev = !(year === MIN_YEAR && month === 1);
  const canNext = !(year === MAX_YEAR && month === 12);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.h1}>Aylık Nöbet Özeti</Text>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => nav(-1)}
            disabled={!canPrev}
            style={[styles.navBtn, !canPrev && { opacity: 0.35 }]}
            testID="ozet-prev"
          >
            <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.monthLabel}>{TR_MONTHS[month - 1]} {year}</Text>
          <Pressable
            onPress={() => nav(1)}
            disabled={!canNext}
            style={[styles.navBtn, !canNext && { opacity: 0.35 }]}
            testID="ozet-next"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Çalışma Günü</Text>
              <Text style={styles.statValue}>{workingDays}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Resmi Tatil</Text>
              <Text style={[styles.statValue, { color: colors.error }]}>{official}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>İdari İzin</Text>
              <Text style={styles.statValue}>{overrideCount}</Text>
            </View>
          </View>

          <View style={styles.avgBar}>
            <Text style={styles.avgLabel}>Hekim Başına Ortalama</Text>
            <Text style={styles.avgValue}>{avg} nöbet</Text>
          </View>

          <Text style={styles.sectionTitle}>Nöbet Dağılımı</Text>

          {phys.length === 0 ? (
            <Text style={styles.emptyBody}>Hekim eklenmedi.</Text>
          ) : (
            phys.map((p) => {
              const c = counts[p.id] || 0;
              const pct = Math.round((c / maxCount) * 100);
              return (
                <View key={p.id} style={styles.pRow} testID={`ozet-row-${p.code}`}>
                  <View style={[styles.avatar, { backgroundColor: p.color }]}>
                    <Text style={styles.avatarText}>{p.code.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.pTop}>
                      <Text style={styles.pName}>{p.name}</Text>
                      <Text style={styles.pCount}>{c} gün</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFg,
                          { width: `${pct}%`, backgroundColor: p.color },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <Text style={styles.creditFooter}>Yazılım ve Geliştirme: Dr. Furkan Aksoy</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  h1: { fontSize: 22, fontWeight: '800', color: colors.onSurface, marginTop: spacing.sm, letterSpacing: -0.3 },
  monthRow: {
    marginTop: spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  navBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { marginTop: 4, fontSize: 22, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  avgBar: {
    marginTop: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
  },
  avgLabel: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: '600' },
  avgValue: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: '800' },
  sectionTitle: {
    marginTop: spacing.xl, marginBottom: spacing.md,
    fontSize: 12, fontWeight: '800', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  emptyBody: { fontSize: 13, color: colors.onSurfaceSecondary, textAlign: 'center', paddingVertical: spacing.xl },
  pRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  pTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pName: { fontSize: 14, fontWeight: '700', color: colors.onSurface },
  pCount: { fontSize: 12, color: colors.onSurfaceSecondary, fontWeight: '700' },
  progressBg: {
    marginTop: spacing.sm,
    height: 6, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    overflow: 'hidden',
  },
  progressFg: { height: '100%', borderRadius: radius.pill },
  creditFooter: {
    marginTop: spacing.xxl, fontSize: 11,
    color: colors.muted, textAlign: 'center',
  },
});

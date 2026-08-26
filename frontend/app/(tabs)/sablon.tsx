import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { physicianApi, templateApi, type Physician, type Template } from '@/src/lib/api';
import { colors, radius, spacing, TR_WEEKDAYS_LONG } from '@/src/lib/theme';

const DAYS = [
  { key: '1', label: TR_WEEKDAYS_LONG[0] },
  { key: '2', label: TR_WEEKDAYS_LONG[1] },
  { key: '3', label: TR_WEEKDAYS_LONG[2] },
  { key: '4', label: TR_WEEKDAYS_LONG[3] },
  { key: '5', label: TR_WEEKDAYS_LONG[4] },
  { key: '6', label: TR_WEEKDAYS_LONG[5] },
  { key: '7', label: TR_WEEKDAYS_LONG[6] },
];

export default function SablonScreen() {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [template, setTemplate] = useState<Template>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ph, tpl] = await Promise.all([physicianApi.list(), templateApi.get()]);
      setPhysicians(ph);
      setTemplate(tpl.template || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = (day: string, id: string) => {
    setTemplate((cur) => {
      const arr = cur[day] || [];
      const nxt = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...cur, [day]: nxt };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await templateApi.put(template);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.h1}>Haftalık Şablon</Text>
        <Text style={styles.sub}>
          Her gün için varsayılan nöbetçi hekimleri seçin. "Şablonu Ay Geneline Uygula" ile
          ay otomatik doldurulur.
        </Text>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : physicians.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Önce hekim ekleyin</Text>
          <Text style={styles.emptyBody}>
            Şablon oluşturabilmek için Hekimler sekmesinden hekim ekleyin.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          {DAYS.map((d) => {
            const sel = template[d.key] || [];
            return (
              <View key={d.key} style={styles.dayCard} testID={`tpl-day-${d.key}`}>
                <Text style={styles.dayTitle}>{d.label}</Text>
                <View style={styles.chipsRow}>
                  {physicians.map((p) => {
                    const on = sel.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => toggle(d.key, p.id)}
                        style={[
                          styles.chip,
                          on && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
                        ]}
                        testID={`tpl-${d.key}-${p.code}`}
                      >
                        <View style={[styles.dot, { backgroundColor: p.color }]} />
                        <Text style={[styles.chipText, on && { color: colors.onBrandPrimary }]}>
                          {p.code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {sel.length === 0 && (
                  <Text style={styles.emptyDay}>Bu gün için hekim seçilmedi.</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {physicians.length > 0 && (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <Pressable onPress={save} disabled={saving} style={styles.fab} testID="tpl-save">
            <Ionicons name={savedFlash ? 'checkmark' : 'save-outline'} size={16} color={colors.onBrandPrimary} />
            <Text style={styles.fabText}>
              {savedFlash ? 'Kaydedildi' : saving ? 'Kaydediliyor…' : 'Şablonu Kaydet'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  h1: { fontSize: 22, fontWeight: '800', color: colors.onSurface, marginTop: spacing.sm, letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 13, color: colors.onSurfaceSecondary, lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  emptyBody: { marginTop: spacing.sm, fontSize: 13, color: colors.onSurfaceSecondary, textAlign: 'center' },
  dayCard: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md, backgroundColor: colors.surface,
  },
  dayTitle: { fontSize: 14, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.2 },
  chipsRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.onSurface },
  dot: { width: 8, height: 8, borderRadius: 999 },
  emptyDay: { marginTop: spacing.sm, fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: radius.pill, backgroundColor: colors.brandPrimary,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  fabText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: '700' },
});

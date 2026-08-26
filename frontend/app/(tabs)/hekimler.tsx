import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { physicianApi, type Physician } from '@/src/lib/api';
import { colors, PHYSICIAN_COLORS, radius, spacing } from '@/src/lib/theme';

export default function HekimlerScreen() {
  const [items, setItems] = useState<Physician[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Physician | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PHYSICIAN_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await physicianApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditing(null);
    setName('');
    setCode('');
    setColor(PHYSICIAN_COLORS[items.length % PHYSICIAN_COLORS.length]);
    setError(null);
    setEditorOpen(true);
  };

  const openEdit = (p: Physician) => {
    setEditing(p);
    setName(p.name);
    setCode(p.code);
    setColor(p.color);
    setError(null);
    setEditorOpen(true);
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError('İsim gerekli');
    if (!code.trim()) return setError('Kod gerekli');
    setSaving(true);
    try {
      if (editing) {
        await physicianApi.update(editing.id, { name: name.trim(), code: code.trim(), color });
      } else {
        await physicianApi.create({ name: name.trim(), code: code.trim(), color });
      }
      setEditorOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Physician) => {
    await physicianApi.remove(p.id);
    await load();
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.h1}>Hekim Listesi</Text>
        <Text style={styles.sub}>Nöbet çizelgesi için hekimleri yönetin.</Text>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={28} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Henüz hekim eklenmedi</Text>
          <Text style={styles.emptyBody}>
            Nöbet planı oluşturmak için önce hekimleri ekleyin.
          </Text>
          <Pressable onPress={openNew} style={styles.primaryBtn} testID="hekim-empty-add">
            <Ionicons name="add" size={16} color={colors.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>Hekim Ekle</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          {items.map((p) => (
            <View key={p.id} style={styles.row} testID={`hekim-row-${p.code}`}>
              <View style={[styles.avatar, { backgroundColor: p.color }]}>
                <Text style={styles.avatarText}>{p.code.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowCode}>Kod: {p.code}</Text>
              </View>
              <Pressable onPress={() => openEdit(p)} style={styles.iconBtn} testID={`hekim-edit-${p.code}`}>
                <Ionicons name="create-outline" size={18} color={colors.onSurface} />
              </Pressable>
              <Pressable onPress={() => remove(p)} style={styles.iconBtn} testID={`hekim-del-${p.code}`}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {items.length > 0 && (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <Pressable onPress={openNew} style={styles.fab} testID="hekim-add">
            <Ionicons name="add" size={20} color={colors.onBrandPrimary} />
            <Text style={styles.fabText}>Hekim Ekle</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditorOpen(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalWrap}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.modalTitle}>
                {editing ? 'Hekim Düzenle' : 'Hekim Ekle'}
              </Text>

              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Örn. Dr. Ahmet Yılmaz"
                placeholderTextColor={colors.muted}
                style={styles.input}
                testID="hekim-input-name"
              />

              <Text style={styles.label}>Kısa Kod</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Örn. A, AY, Dr1"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                maxLength={6}
                style={styles.input}
                testID="hekim-input-code"
              />

              <Text style={styles.label}>Renk Etiketi</Text>
              <View style={styles.swatchRow}>
                {PHYSICIAN_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      color === c && styles.swatchActive,
                    ]}
                  />
                ))}
              </View>

              {error && <Text style={styles.err}>{error}</Text>}

              <Pressable onPress={save} disabled={saving} style={styles.primaryBtnFull} testID="hekim-save">
                <Text style={styles.primaryBtnText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
  h1: { fontSize: 22, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.3, marginTop: spacing.sm },
  sub: { marginTop: 4, fontSize: 13, color: colors.onSurfaceSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: {
    width: 60, height: 60, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { marginTop: spacing.lg, fontSize: 18, fontWeight: '700', color: colors.onSurface },
  emptyBody: { marginTop: 4, fontSize: 13, color: colors.onSurfaceSecondary, textAlign: 'center' },
  primaryBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: radius.pill, backgroundColor: colors.brandPrimary,
  },
  primaryBtnText: { color: colors.onBrandPrimary, fontWeight: '700', fontSize: 14 },
  primaryBtnFull: {
    marginTop: spacing.lg, height: 52,
    borderRadius: radius.md, backgroundColor: colors.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: colors.surface,
  },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  rowCode: { fontSize: 12, color: colors.muted, marginTop: 2 },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: radius.pill, backgroundColor: colors.brandPrimary,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  fabText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.5)' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingTop: spacing.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.onSurface, marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: spacing.md, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    marginTop: spacing.sm,
    height: 48, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    fontSize: 15, color: colors.onSurface, backgroundColor: colors.surface,
  },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  swatch: {
    width: 32, height: 32, borderRadius: radius.pill,
    borderWidth: 2, borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.onSurface },
  err: { color: colors.error, fontSize: 13, fontWeight: '600', marginTop: spacing.md },
});

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/src/lib/theme';

type Props = {
  title: string;
  subtitle: string;
  onSubmit: (pin: string) => Promise<string | null>; // returns error string or null
  ctaLabel: string;
  minLength?: number;
  testIDPrefix?: string;
};

export function PinPad({
  title,
  subtitle,
  onSubmit,
  ctaLabel,
  minLength = 4,
  testIDPrefix = 'pin',
}: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const shake = useMemo(() => new Animated.Value(0), []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const press = async (digit: string) => {
    if (loading) return;
    setError(null);
    if (digit === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (digit === 'ok') {
      if (pin.length < minLength) {
        setError(`PIN en az ${minLength} haneli olmalı`);
        triggerShake();
        return;
      }
      setLoading(true);
      const err = await onSubmit(pin);
      setLoading(false);
      if (err) {
        setError(err);
        triggerShake();
        setPin('');
      }
      return;
    }
    if (pin.length >= 6) return;
    setPin((p) => p + digit);
  };

  const dots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBlock}>
        <Text style={styles.title} testID={`${testIDPrefix}-title`}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </Animated.View>
        {error ? (
          <Text style={styles.error} testID={`${testIDPrefix}-error`}>{error}</Text>
        ) : (
          <Text style={styles.errorPlaceholder}> </Text>
        )}
      </View>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <PadKey key={d} label={d} onPress={() => press(d)} testID={`${testIDPrefix}-key-${d}`} />
        ))}
        <PadKey label="" onPress={() => {}} disabled />
        <PadKey label="0" onPress={() => press('0')} testID={`${testIDPrefix}-key-0`} />
        <PadKey
          icon="backspace-outline"
          onPress={() => press('del')}
          testID={`${testIDPrefix}-key-del`}
        />
      </View>
      <Pressable
        onPress={() => press('ok')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        testID={`${testIDPrefix}-submit`}
      >
        <Text style={styles.ctaText}>{loading ? 'İşleniyor…' : ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

function PadKey({
  label,
  icon,
  onPress,
  disabled,
  testID,
}: {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.padKey,
        disabled && { opacity: 0 },
        pressed && !disabled && { backgroundColor: colors.surfaceTertiary },
      ]}
      testID={testID}
    >
      {icon ? (
        <Ionicons name={icon} size={22} color={colors.onSurface} />
      ) : (
        <Text style={styles.padKeyText}>{label}</Text>
      )}
    </Pressable>
  );
}

export default function LoginOrSetupScreen({
  mode,
}: {
  mode: 'login' | 'setup';
}) {
  const router = useRouter();
  const { authApi } = require('@/src/lib/api');

  const handle = async (pin: string): Promise<string | null> => {
    try {
      if (mode === 'setup') {
        await authApi.setup(pin);
      } else {
        await authApi.verify(pin);
      }
      router.replace('/(tabs)');
      return null;
    } catch (e: any) {
      return e?.message || 'Bir hata oluştu';
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.surface, '#F9FAFB', '#E5E7EB']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="medkit" size={18} color={colors.onBrandPrimary} />
          </View>
          <View>
            <Text style={styles.brand}>ASM Nöbet Çizelgesi</Text>
            <Text style={styles.brandSub}>Aile Sağlığı Merkezi</Text>
          </View>
        </View>
        <PinPad
          title={mode === 'setup' ? 'PIN Belirleyin' : 'PIN Giriş'}
          subtitle={
            mode === 'setup'
              ? 'Sisteme erişimi güvenli kılmak için 4-6 haneli bir PIN belirleyin.'
              : 'Kayıtlı PIN kodunuzu giriniz.'
          }
          onSubmit={handle}
          ctaLabel={mode === 'setup' ? 'PIN\'i Kaydet' : 'Giriş Yap'}
        />
        <Text style={styles.footer}>Yazılım ve Geliştirme: Dr. Furkan Aksoy</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  wrap: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  brandSub: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  topBlock: { paddingTop: spacing.xxl, alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  dotsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  dotFilled: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dotError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.md, fontWeight: '600' },
  errorPlaceholder: { fontSize: 13, marginTop: spacing.md, opacity: 0 },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
    marginTop: spacing.xl,
  },
  padKey: {
    width: '30%',
    aspectRatio: 1.6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  padKeyText: { fontSize: 26, fontWeight: '600', color: colors.onSurface },
  cta: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  ctaText: {
    color: colors.onBrandPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  footer: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
});

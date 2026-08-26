import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { authApi } from '@/src/lib/api';
import { colors } from '@/src/lib/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const s = await authApi.status();
        if (s.is_setup) {
          router.replace('/login');
        } else {
          router.replace('/setup');
        }
      } catch (e) {
        // If backend unreachable, still route to setup so user can retry.
        router.replace('/setup');
      }
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="boot-screen">
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

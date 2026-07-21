import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { usePalette } from '@/components/ui';

export default function Index() {
  const { session, loading } = useAuth();
  const p = usePalette();

  useEffect(() => {
    if (loading) return;
    if (session) router.replace('/(app)/dashboard');
    else router.replace('/sign-in');
  }, [session, loading]);

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ActivityIndicator size="large" color={p.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

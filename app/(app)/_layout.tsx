import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { usePalette } from '@/components/ui';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const p = usePalette();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/sign-in');
  }, [session, loading]);

  if (loading || !session) {
    return (
      <View style={[styles.center, { backgroundColor: p.bg }]}>
        <ActivityIndicator size="large" color={p.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="zone-numbers" />
      <Stack.Screen name="zone-types" />
      <Stack.Screen name="circles" />
      <Stack.Screen name="mozas" />
      <Stack.Screen name="users" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

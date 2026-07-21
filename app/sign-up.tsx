import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Link, router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { usePalette, Input, Button, ErrorText, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const p = usePalette();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsapp, setWhatsapp] = useState('https://wa.me/0000000000');

  React.useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'admin_whatsapp_link').maybeSingle().then(({ data }) => {
      if (data?.value) setWhatsapp(data.value);
    });
  }, []);

  const onSubmit = async () => {
    setError('');
    if (!name || !email || !password) { setError('All fields are required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const res = await signUp(name.trim(), email.trim(), password);
    setLoading(false);
    if (res.error) setError(res.error);
    else router.replace('/(app)/dashboard');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: p.bg }]} keyboardShouldPersistTaps="handled">
        <View style={styles.center}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: p.primary }]}>
              <Text style={[styles.logoText, { color: p.primaryText }]}>H</Text>
            </View>
            <Text style={[styles.title, { color: p.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: p.textMuted }]}>Hamza Sugar Mills</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.field}><Input value={name} onChangeText={setName} placeholder="Name" /></View>
            <View style={styles.field}><Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" /></View>
            <View style={styles.field}><Input value={password} onChangeText={setPassword} placeholder="Password" secure /></View>
            <View style={styles.field}><Input value={confirm} onChangeText={setConfirm} placeholder="Confirm Password" secure /></View>
            {error ? <View style={{ marginBottom: 10 }}><ErrorText message={error} /></View> : null}
            <Button title="Sign Up" onPress={onSubmit} loading={loading} />
            <View style={styles.row}>
              <Text style={{ color: p.textMuted, fontSize: 14 }}>Already have an account? </Text>
              <Link href="/sign-in" asChild>
                <TouchableOpacity><Text style={{ color: p.primary, fontWeight: '600', fontSize: 14 }}>Sign in</Text></TouchableOpacity>
              </Link>
            </View>
          </Card>

          <TouchableOpacity
            onPress={() => { if (Platform.OS === 'web') window.open(whatsapp, '_blank'); }}
            style={[styles.waBtn, { borderColor: p.border, backgroundColor: p.surface }]}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#25D366" />
            <Text style={[styles.waText, { color: p.text }]}>Contact Admin via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { width: '100%', maxWidth: 420, alignItems: 'stretch' },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 34, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  card: { padding: 20 },
  field: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 18 },
  waText: { fontSize: 14, fontWeight: '600' },
});

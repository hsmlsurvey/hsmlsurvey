import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ScrollView, 
  KeyboardAvoidingView, 
  Linking 
} from 'react-native';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { usePalette, Input, Button, ErrorText, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const p = usePalette();
  const { signIn } = useAuth();

  // 1. Hydration Safety Guard (Fixes React Error #418)
  const [isMounted, setIsMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    setIsMounted(true);

    async function fetchWhatsAppSetting() {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'admin_whatsapp_link')
          .maybeSingle();

        if (error) {
          console.error('Supabase RLS/Fetch Error:', error.message);
          return;
        }

        if (data?.value) {
          let val = data.value.trim();
          if (val.includes('wa.me/+')) {
            val = val.replace('wa.me/+', 'wa.me/');
          }
          setWhatsapp(val);
        }
      } catch (err) {
        console.error('Unexpected error fetching setting:', err);
      }
    }

    fetchWhatsAppSetting();
  }, []);

  // Browser Client Mount hone se pehle render hone se rokein
  if (!isMounted) {
    return null;
  }

  const onSubmit = async () => {
    setError('');
    if (!email || !password) { 
      setError('Enter email and password.'); 
      return; 
    }
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);
    if (res.error) setError(res.error);
    else router.replace('/(app)/dashboard');
  };

  const handleWhatsAppClick = () => {
    if (!whatsapp) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(whatsapp, '_blank');
    } else {
      Linking.openURL(whatsapp);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'web' ? undefined : 'padding'} 
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[styles.scroll, { backgroundColor: p.bg }]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.center}>
          {/* Brand Logo & Title */}
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: p.primary }]}>
              <Text style={[styles.logoText, { color: p.primaryText }]}>H</Text>
            </View>
            <Text style={[styles.title, { color: p.text }]}>Hamza Sugar Mills</Text>
            <Text style={[styles.subtitle, { color: p.textMuted }]}>Grower Survey</Text>
          </View>

          {/* Form Card */}
          <Card style={styles.card}>
            <Text style={[styles.formTitle, { color: p.text }]}>Sign In</Text>
            
            <View style={styles.field}>
              <Input 
                value={email} 
                onChangeText={setEmail} 
                placeholder="Email" 
                keyboardType="email-address" 
              />
            </View>

            <View style={styles.field}>
              <Input 
                value={password} 
                onChangeText={setPassword} 
                placeholder="Password" 
                secure 
              />
            </View>

            {error ? (
              <View style={{ marginBottom: 10 }}>
                <ErrorText message={error} />
              </View>
            ) : null}

            <Button title="Sign In" onPress={onSubmit} loading={loading} />

            <View style={styles.row}>
              <Text style={{ color: p.textMuted, fontSize: 14 }}>New user? </Text>
              <TouchableOpacity onPress={() => router.push('/sign-up')}>
                <Text style={{ color: p.primary, fontWeight: '600', fontSize: 14 }}>
                  Create account
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* WhatsApp Button */}
          {whatsapp ? (
            <TouchableOpacity
              onPress={handleWhatsAppClick}
              style={[
                styles.waBtn, 
                { borderColor: p.border, backgroundColor: p.surface }
              ]}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color="#25D366" />
              <Text style={[styles.waText, { color: p.text }]}>
                Contact Admin via WhatsApp
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  center: { 
    width: '100%', 
    maxWidth: 420, 
    alignItems: 'stretch' 
  },
  brand: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  logo: { 
    width: 64, 
    height: 64, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  logoText: { 
    fontSize: 34, 
    fontWeight: '800' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800' 
  },
  subtitle: { 
    fontSize: 13, 
    marginTop: 4 
  },
  card: { 
    padding: 20, 
    gap: 4 
  },
  formTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12 
  },
  field: { 
    marginBottom: 12 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 14 
  },
  waBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    marginTop: 18,
    // Fix Deprecated Shadow Warning on Web
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  waText: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { paletteFor, Palette } from '@/theme/palette';

export function usePalette(): Palette {
  const { mode } = useTheme();
  return paletteFor(mode);
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, style]}>{children}</View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const p = usePalette();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.sectionTitle, { color: p.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, { color: p.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

interface InputProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  caption?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
}

export function Input(props: InputProps) {
  const p = usePalette();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const secure = props.secure && !show;
  const caption = props.caption || props.placeholder;
  return (
    <View
      style={[
        styles.inputWrap,
        {
          borderColor: focused ? p.primary : p.border,
          backgroundColor: p.inputBg,
        },
        props.style,
      ]}
    >
      <Text
        style={[
          styles.inputCaption,
          {
            color: focused ? p.primary : p.textMuted,
            backgroundColor: p.inputBg,
          },
        ]}
        numberOfLines={1}
      >
        {caption}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={p.textMuted}
          secureTextEntry={secure}
          keyboardType={props.keyboardType || 'default'}
          multiline={props.multiline}
          numberOfLines={props.numberOfLines}
          editable={props.editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: p.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {props.secure ? (
          <TouchableOpacity onPress={() => setShow((s) => !s)} style={styles.eyeBtn}>
            {show ? <EyeOff size={18} color={p.textMuted} /> : <Eye size={18} color={p.textMuted} />}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

interface BtnProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  small?: boolean;
}
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, small }: BtnProps) {
  const p = usePalette();
  const bg =
    variant === 'primary'
      ? p.primary
      : variant === 'danger'
      ? p.error
      : variant === 'soft'
      ? p.primarySoft
      : 'transparent';
  const fg = variant === 'soft' ? p.primary : variant === 'ghost' ? p.text : p.primaryText;
  const border = variant === 'ghost' ? p.border : 'transparent';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderColor: border, opacity: disabled || loading ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon}
          <Text style={[styles.btnText, { color: fg }, small && styles.btnTextSmall]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'error' | 'primary' }) {
  const p = usePalette();
  const bg =
    tone === 'success'
      ? p.primarySoft
      : tone === 'warning'
      ? 'rgba(201, 122, 4, 0.15)'
      : tone === 'error'
      ? 'rgba(214, 69, 69, 0.15)'
      : tone === 'primary'
      ? p.primarySoft
      : p.surfaceAlt;
  const fg = tone === 'success' ? p.primary : tone === 'warning' ? p.warning : tone === 'error' ? p.error : tone === 'primary' ? p.primary : p.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const p = usePalette();
  return (
    <View style={styles.empty}>
      <Text style={{ color: p.textMuted, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function Loading() {
  const p = usePalette();
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={p.primary} />
    </View>
  );
}

export function ScrollArea({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[{ flex: 1 }, style]}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function GlobalScrollbarStyle() {
  const p = usePalette();
  if (Platform.OS !== 'web') return null;
  return (
    <style>{`
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: ${p.scrollbarTrack}; border-radius: 8px; }
      ::-webkit-scrollbar-thumb { background: ${p.scrollbar}; border-radius: 8px; border: 2px solid ${p.scrollbarTrack}; }
      ::-webkit-scrollbar-thumb:hover { background: ${p.primary}; }
      * { scrollbar-width: thin; scrollbar-color: ${p.scrollbar} ${p.scrollbarTrack}; }
    `}</style>
  );
}

export function ErrorText({ message }: { message: string }) {
  const p = usePalette();
  return <Text style={[styles.errorText, { color: p.error }]}>{message}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
    position: 'relative',
  },
  inputCaption: {
    position: 'absolute',
    top: -7,
    left: 10,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    outlineWidth: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextSmall: {
    fontSize: 13,
  fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

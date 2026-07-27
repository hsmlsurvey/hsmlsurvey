import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  LayoutDashboard,
  FileText,
  Map,
  Circle,
  MapPin,
  Users,
  BarChart3,
  ClipboardList,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  KeyRound,
  MessageCircle,
  Settings,
  ShieldCheck,
  Hash,
  Layers,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePalette, Input, Button, ErrorText } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  visible: boolean;
}

// Global variable to persist scroll position across route changes
let globalSidebarScrollY = 0;

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const p = usePalette();
  const { mode, toggle } = useTheme();
  const { profile, signOut, can } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // Controls sidebar visibility
  const [pwOpen, setPwOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false); // Drop-up menu state

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/(app)/dashboard', icon: <LayoutDashboard size={18} color={p.sidebarText} />, visible: true },
    { label: 'Zone Numbers', href: '/(app)/zone-numbers', icon: <Hash size={18} color={p.sidebarText} />, visible: can('zone_numbers', 'view') || can('zone_numbers', 'insert') },
    { label: 'Zone Types', href: '/(app)/zone-types', icon: <Layers size={18} color={p.sidebarText} />, visible: can('zone_types', 'view') || can('zone_types', 'insert') },
    { label: 'Circles', href: '/(app)/circles', icon: <Circle size={18} color={p.sidebarText} />, visible: can('circles', 'view') || can('circles', 'insert') },
    { label: 'Mozas', href: '/(app)/mozas', icon: <MapPin size={18} color={p.sidebarText} />, visible: can('mozas', 'view') || can('mozas', 'insert') },
    { label: 'User Management', href: '/(app)/users', icon: <Settings size={18} color={p.sidebarText} />, visible: can('app_users', 'view') || can('app_users', 'insert') },
    { label: 'Permissions', href: '/(app)/permissions', icon: <ShieldCheck size={18} color={p.sidebarText} />, visible: can('app_users', 'update') },
    { label: 'Circle / Moza Wise', href: '/(app)/reports/summary', icon: <BarChart3 size={18} color={p.sidebarText} />, visible: can('report_circle_moza', 'view') },
    { label: 'Category Wise', href: '/(app)/reports/category_wise_report', icon: <BarChart3 size={18} color={p.sidebarText} />, visible: can('report_category', 'view') },
    { label: 'Variety Wise', href: '/(app)/reports/variety_wise_report', icon: <BarChart3 size={18} color={p.sidebarText} />, visible: can('report_variety', 'view') },
    { label: 'Grower Wise', href: '/(app)/reports/grower_wise_report', icon: <ClipboardList size={18} color={p.sidebarText} />, visible: can('report_grower', 'view') },
  ];

  const isActive = (href: string) => {
    const path = href.replace('/(app)', '');
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const handleNav = (href: string) => {
    setOpen(false); // Close menu on selection
    router.push(href as any);
  };

  const sidebarScrollRef = useRef<ScrollView>(null);

  // Restore sidebar scroll position after route change
  useEffect(() => {
    if (globalSidebarScrollY > 0 && sidebarScrollRef.current) {
      setTimeout(() => {
        sidebarScrollRef.current?.scrollTo({ y: globalSidebarScrollY, animated: false });
      }, 10);
    }
  }, [pathname]);

  const SidebarContent = (
    <View style={{ flex: 1 }}>
      <View style={[styles.brandArea, { borderBottomColor: p.sidebarBorder }]}>
        <View style={[styles.logo, { backgroundColor: p.primary }]}>
          <Text style={[styles.logoText, { color: p.primaryText }]}>H</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandTitle, { color: p.sidebarText }]}>Hamza Sugar</Text>
          <Text style={[styles.brandSub, { color: p.sidebarMuted }]}>Mills limited</Text>
        </View>
        <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
          <X size={20} color={p.sidebarText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={sidebarScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 8 }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          globalSidebarScrollY = e.nativeEvent.contentOffset.y;
        }}
      >
        {navItems.filter((n) => n.visible).map((item) => {
          const active = isActive(item.href);
          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => handleNav(item.href)}
              style={[styles.navItem, active && { backgroundColor: p.primary }]}
              activeOpacity={0.8}
            >
              {React.cloneElement(item.icon as any, { color: active ? p.primaryText : p.sidebarText })}
              <Text style={[styles.navText, { color: active ? p.primaryText : p.sidebarText }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.bottomArea, { borderTopColor: p.sidebarBorder }]}>
        {/* User Info Header */}
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: p.primary }]}>
            <Text style={{ color: p.primaryText, fontWeight: '700' }}>
              {(profile?.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.userName, { color: p.sidebarText }]} numberOfLines={1}>{profile?.name || 'User'}</Text>
            <Text style={[styles.userRole, { color: p.sidebarMuted }]} numberOfLines={1}>{profile?.role}</Text>
          </View>
        </View>

        {/* Hidden Options (Shown on Dropup Toggle) */}
        {userMenuOpen && (
          <View style={styles.menuContainer}>
            <TouchableOpacity onPress={() => setPwOpen(true)} style={styles.actionRow} activeOpacity={0.8}>
              <KeyRound size={16} color={p.sidebarText} />
              <Text style={[styles.actionText, { color: p.sidebarText }]}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggle} style={styles.actionRow} activeOpacity={0.8}>
              {mode === 'light' ? <Moon size={16} color={p.sidebarText} /> : <Sun size={16} color={p.sidebarText} />}
              <Text style={[styles.actionText, { color: p.sidebarText }]}>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</Text>
            </TouchableOpacity>

            <ContactAdminButton />
          </View>
        )}

        {/* Sign Out Row + Dropup Toggle Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity onPress={signOut} style={[styles.actionRow, { flex: 1, borderBottomWidth: 0 }]} activeOpacity={0.8}>
            <LogOut size={16} color={p.sidebarText} />
            <Text style={[styles.actionText, { color: p.sidebarText }]}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUserMenuOpen(!userMenuOpen)}
            style={[styles.dropupBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
            activeOpacity={0.7}
          >
            {userMenuOpen ? (
              <ChevronDown size={18} color={p.sidebarText} />
            ) : (
              <ChevronUp size={18} color={p.sidebarText} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: p.bg }]}>
      {/* Sidebar Overlay (Mobile & PC Both) */}
      {open ? (
        <View style={styles.drawerOverlay}>
          <View style={[styles.drawer, { backgroundColor: p.sidebar }]}>{SidebarContent}</View>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            onPress={() => setOpen(false)}
            activeOpacity={1}
          />
        </View>
      ) : null}

      <View style={styles.main}>
        <View style={[styles.topbar, { backgroundColor: p.surface, borderBottomColor: p.border }]}>
          {/* Hamburger Menu Button - Always Visible on Web & Mobile */}
          <TouchableOpacity onPress={() => setOpen(!open)} style={styles.menuBtn} activeOpacity={0.7}>
            <Menu size={22} color={p.text} />
          </TouchableOpacity>

          <Text style={[styles.topbarTitle, { color: p.text }]}>{title}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={toggle} style={styles.iconBtn}>
            {mode === 'light' ? <Moon size={18} color={p.text} /> : <Sun size={18} color={p.text} />}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>{children}</View>
      </View>

      <ChangePasswordModal visible={pwOpen} onClose={() => setPwOpen(false)} />
    </View>
  );
}

function ContactAdminButton() {
  const p = usePalette();
  const [link, setLink] = useState('https://wa.me/0000000000');
  React.useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'admin_whatsapp_link').maybeSingle().then(({ data }) => {
      if (data?.value) setLink(data.value);
    });
  }, []);
  return (
    <TouchableOpacity
      onPress={() => { if (Platform.OS === 'web') window.open(link, '_blank'); }}
      style={styles.actionRow}
      activeOpacity={0.8}
    >
      <MessageCircle size={16} color="#25D366" />
      <Text style={[styles.actionText, { color: p.sidebarText }]}>Contact Admin (WhatsApp)</Text>
    </TouchableOpacity>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const p = usePalette();
  const { user } = useAuth();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setMsg('');
    if (!cur || !nw || !confirm) { setError('All fields required.'); return; }
    if (nw.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (nw !== confirm) { setError('New passwords do not match.'); return; }
    setLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: cur });
    if (signInErr) { setError('Current password is incorrect.'); setLoading(false); return; }
    const { error: updErr } = await supabase.auth.updateUser({ password: nw });
    setLoading(false);
    if (updErr) { setError(updErr.message); return; }
    setMsg('Password updated successfully.');
    setCur(''); setNw(''); setConfirm('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: p.text }]}>Change Password</Text>
            <TouchableOpacity onPress={onClose}><X size={18} color={p.textMuted} /></TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={{ marginBottom: 10 }}><Input value={cur} onChangeText={setCur} placeholder="Current Password" secure /></View>
            <View style={{ marginBottom: 10 }}><Input value={nw} onChangeText={setNw} placeholder="New Password" secure /></View>
            <View style={{ marginBottom: 10 }}><Input value={confirm} onChangeText={setConfirm} placeholder="Confirm New Password" secure /></View>
            {error ? <ErrorText message={error} /> : null}
            {msg ? <Text style={{ color: p.success, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{msg}</Text> : null}
            <Button title="Update Password" onPress={submit} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 270, borderRightWidth: 1 },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  drawer: { width: 270, height: '100%', zIndex: 1001 },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  brandArea: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: '800' },
  brandTitle: { fontSize: 15, fontWeight: '800' },
  brandSub: { fontSize: 11 },
  closeBtn: { padding: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
  },
  navText: { fontSize: 14, fontWeight: '600' },
  bottomArea: { padding: 12, borderTopWidth: 1, gap: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 14, fontWeight: '700' },
  userRole: { fontSize: 11, textTransform: 'capitalize' },
  menuContainer: { marginVertical: 4 },
  signOutContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dropupBtn: { padding: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  actionText: { fontSize: 13, fontWeight: '500' },
  main: { flex: 1, minWidth: 0 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuBtn: { padding: 4, cursor: 'pointer' as any },
  topbarTitle: { fontSize: 18, fontWeight: '700' },
  iconBtn: { padding: 6, borderRadius: 8 },
  content: { flex: 1, padding: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 14, borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { gap: 4 },
});
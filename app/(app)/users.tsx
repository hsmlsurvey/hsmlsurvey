import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { Pencil, Trash2, X, ShieldCheck } from 'lucide-react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Input, Button, Card, EmptyState, ErrorText, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/DataTable';
import { NativeSelect } from '@/components/SimpleCrudScreen';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AppUser, Role, UserStatus } from '@/types';

export default function UsersScreen() {
  const p = usePalette();
  const { profile, can, refreshProfile } = useAuth();
  const [rows, setRows] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [status, setStatus] = useState<UserStatus>('active');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [waLink, setWaLink] = useState('');
  const [waSaving, setWaSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
      if (e) throw e;
      setRows((data || []) as AppUser[]);
      const { data: s } = await supabase.from('app_settings').select('value').eq('key', 'admin_whatsapp_link').maybeSingle();
      setWaLink(s?.value || '');
    } catch (e: any) {
      setError(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (row: AppUser) => {
    setEditingId(row.id);
    setName(row.name); setEmail(row.email); setRole(row.role); setStatus(row.status);
    setFormError('');
    setModalOpen(true);
  };

  const onDelete = async (row: AppUser) => {
    if (row.id === profile?.id) { alert('You cannot delete your own account.'); return; }
    if (row.role === 'admin') { alert("Cannot delete an admin. Change their role first via Permissions."); return; }
    if (!confirm(`Delete user ${row.email}?`)) return;
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', row.id);
      if (error) throw error;
      load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed.');
    }
  };

  const save = async () => {
    setFormError('');
    if (!name) { setFormError('Name is required.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('app_users').update({
        name, role, status, is_active: status === 'active',
      }).eq('id', editingId);
      if (error) throw error;
      if (editingId === profile?.id) await refreshProfile();
      setModalOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const saveWa = async () => {
    setWaSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({ key: 'admin_whatsapp_link', value: waLink }, { onConflict: 'key' });
      if (error) throw error;
      setSettingsOpen(false);
    } catch (e: any) {
      alert(e?.message || 'Save failed.');
    } finally {
      setWaSaving(false);
    }
  };

  const columns: Column<AppUser>[] = [
    { key: 'name', label: 'Name', width: 180, render: (r) => <Text style={{ fontWeight: '700', color: p.text }}>{r.name}</Text> },
    { key: 'email', label: 'Email', width: 240 },
    { key: 'role', label: 'Role', width: 120, render: (r) => <Badge label={r.role} tone={r.role === 'admin' ? 'primary' : 'neutral'} /> },
    { key: 'status', label: 'Status', width: 120, render: (r) => <Badge label={r.status} tone={r.status === 'active' ? 'success' : 'error'} /> },
    {
      key: '_actions', label: '', sortable: false, align: 'right', width: 100,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
          {can('app_users', 'update') ? (
            <TouchableOpacity onPress={() => openEdit(r)} style={[styles.iconBtn, { borderColor: p.border }]}><Pencil size={14} color={p.primary} /></TouchableOpacity>
          ) : null}
          {can('app_users', 'delete') && r.role !== 'admin' ? (
            <TouchableOpacity onPress={() => onDelete(r)} style={[styles.iconBtn, { borderColor: p.border }]}><Trash2 size={14} color={p.error} /></TouchableOpacity>
          ) : null}
        </View>
      ),
    },
  ];

  return (
    <AppShell title="User Management">
      <View style={{ flex: 1 }}>
        <View style={styles.topActions}>
          <View>
            <Text style={[styles.pageTitle, { color: p.text }]}>User Management</Text>
            <Text style={[styles.pageSub, { color: p.textMuted }]}>{rows.length} user(s) · manage roles & status</Text>
          </View>
          {profile?.role === 'admin' ? (
            <Button title="WhatsApp Link" variant="ghost" onPress={() => setSettingsOpen(true)} icon={<ShieldCheck size={16} color={p.text} />} />
          ) : null}
        </View>

        {error ? <View style={{ marginBottom: 12 }}><ErrorText message={error} /></View> : null}

        <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {loading ? <EmptyState message="Loading..." /> : <DataTable columns={columns} rows={rows} smallHeaders />}
        </Card>

      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: p.text }]}>Edit User</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={18} color={p.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: Platform.OS === 'web' ? (window.innerHeight * 0.7) : 480 }} contentContainerStyle={{ gap: 12, padding: 4 }}>
              <Input value={name} onChangeText={setName} placeholder="Name" />
              <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" editable={false} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: p.textMuted }]}>Role</Text>
                  <NativeSelect value={role} placeholder="Role" options={[{ value: 'admin', label: 'Admin' }, { value: 'moderator', label: 'Moderator' }, { value: 'user', label: 'User' }]} onChange={(v) => setRole(v as Role)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: p.textMuted }]}>Status</Text>
                  <NativeSelect value={status} placeholder="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} onChange={(v) => setStatus(v as UserStatus)} />
                </View>
              </View>
              {formError ? <ErrorText message={formError} /> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="ghost" style={{ flex: 1 }} />
                <Button title="Update" onPress={save} loading={saving} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 480, backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: p.text }]}>Admin WhatsApp Link</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}><X size={18} color={p.textMuted} /></TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              <Input value={waLink} onChangeText={setWaLink} placeholder="https://wa.me/92XXXXXXXXXX" />
              <Button title="Save Link" onPress={saveWa} loading={waSaving} />
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 520, borderRadius: 14, borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
});

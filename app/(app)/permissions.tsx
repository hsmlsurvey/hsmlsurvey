import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ShieldCheck, Save } from 'lucide-react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Button, Card, SectionTitle, EmptyState, ErrorText, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Role, Permissions, ALL_TABLES, ALL_ACTIONS, TABLE_LABELS, fullPermissions, emptyPermissions } from '@/types';
import { loadRolePermissions, invalidateRolePermissions } from '@/lib/rolePermissions';

const ROLES: Role[] = ['admin', 'moderator', 'user'];

export default function PermissionsScreen() {
  const p = usePalette();
  const { profile } = useAuth();
  const [rolePerms, setRolePerms] = useState<Record<Role, Permissions>>({
    admin: fullPermissions(),
    moderator: emptyPermissions(),
    user: emptyPermissions(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const perms = await loadRolePermissions();
      setRolePerms({
        admin: perms.admin || fullPermissions(),
        moderator: perms.moderator || emptyPermissions(),
        user: perms.user || emptyPermissions(),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePerm = (role: Role, table: keyof Permissions, action: typeof ALL_ACTIONS[number]) => {
    setRolePerms((prev) => {
      const next = { ...prev };
      const t = { ...(next[role][table] || {}) };
      t[action] = !t[action];
      next[role] = { ...next[role], [table]: t };
      return next;
    });
  };

  const save = async () => {
    setFormError('');
    setSavedMsg('');
    setSaving(true);
    try {
      for (const role of ROLES) {
        if (role === 'admin') continue;
        const { error } = await supabase
          .from('role_permissions')
          .update({ permissions: rolePerms[role] })
          .eq('role', role);
        if (error) throw error;
      }
      invalidateRolePermissions();
      setSavedMsg('Permissions saved successfully.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e: any) {
      setFormError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Permissions Management">
      <View style={{ flex: 1 }}>
        <View style={styles.topActions}>
          <View>
            <Text style={[styles.pageTitle, { color: p.text }]}>Permissions Management</Text>
            <Text style={[styles.pageSub, { color: p.textMuted }]}>Role-based permissions — all users of a role share the same access</Text>
          </View>
          <Button title="Save Permissions" onPress={save} loading={saving} icon={<Save size={16} color={p.primaryText} />} />
        </View>

        {error ? <View style={{ marginBottom: 12 }}><ErrorText message={error} /></View> : null}
        {formError ? <View style={{ marginBottom: 12 }}><ErrorText message={formError} /></View> : null}
        {savedMsg ? (
          <View style={{ marginBottom: 12, padding: 10, backgroundColor: p.primarySoft, borderRadius: 8 }}>
            <Text style={{ color: p.primary, fontWeight: '700', fontSize: 13 }}>{savedMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <Card><EmptyState message="Loading..." /></Card>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, gap: 16 }}>
            {/* Admin */}
            <Card>
              <View style={[styles.roleHeader, { borderBottomColor: p.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} color={p.primary} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: p.text }}>Admin Role</Text>
                </View>
                <Badge label="Full Access" tone="primary" />
              </View>
              <View style={{ padding: 12 }}>
                <Text style={{ color: p.textMuted, fontSize: 13 }}>
                  Admin automatically has full access to all tables and all actions. No configuration needed.
                </Text>
              </View>
            </Card>

            {/* Moderator */}
            <Card>
              <View style={[styles.roleHeader, { borderBottomColor: p.border }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: p.text }}>Moderator Role</Text>
                <Badge label="Moderator" tone="neutral" />
              </View>
              <PermMatrix
                role="moderator"
                perms={rolePerms.moderator}
                onToggle={togglePerm}
                palette={p}
              />
              <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
                <Button title="Grant All" small variant="soft" onPress={() => setRolePerms((prev) => ({ ...prev, moderator: fullPermissions() }))} />
                <Button title="Clear All" small variant="ghost" onPress={() => setRolePerms((prev) => ({ ...prev, moderator: emptyPermissions() }))} />
              </View>
            </Card>

            {/* User */}
            <Card>
              <View style={[styles.roleHeader, { borderBottomColor: p.border }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: p.text }}>User Role</Text>
                <Badge label="User" tone="neutral" />
              </View>
              <PermMatrix
                role="user"
                perms={rolePerms.user}
                onToggle={togglePerm}
                palette={p}
              />
              <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
                <Button title="Grant All" small variant="soft" onPress={() => setRolePerms((prev) => ({ ...prev, user: fullPermissions() }))} />
                <Button title="Clear All" small variant="ghost" onPress={() => setRolePerms((prev) => ({ ...prev, user: emptyPermissions() }))} />
              </View>
            </Card>
          </ScrollView>
        )}
      </View>
    </AppShell>
  );
}

function PermMatrix({ role, perms, onToggle, palette: p }: { role: Role; perms: Permissions; onToggle: (role: Role, table: keyof Permissions, action: typeof ALL_ACTIONS[number]) => void; palette: any }) {
  return (
    <View style={{ padding: 12 }}>
      <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
        <View style={[styles.permHeader, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
          <Text style={[styles.permHeadCell, { color: p.textMuted, flex: 1.6 }]}>Table</Text>
          {ALL_ACTIONS.map((a) => (
            <Text key={a} style={[styles.permHeadCell, { color: p.textMuted, flex: 1, textTransform: 'capitalize' }]}>{a}</Text>
          ))}
        </View>
        {ALL_TABLES.map((t) => (
          <View key={t} style={[styles.permRow, { borderBottomColor: p.border }]}>
            <Text style={[styles.permCell, { color: p.text, flex: 1.6, fontWeight: '600' }]}>{TABLE_LABELS[t]}</Text>
            {ALL_ACTIONS.map((a) => {
              const checked = perms?.[t]?.[a] === true;
              return (
                <View key={a} style={{ flex: 1, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => onToggle(role, t, a)}
                    style={[styles.checkbox, { backgroundColor: checked ? p.primary : 'transparent', borderColor: checked ? p.primary : p.border }]}
                    activeOpacity={0.7}
                  >
                    {checked ? <Text style={{ color: p.primaryText, fontSize: 11, fontWeight: '800' }}>✓</Text> : null}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: 2 },
  roleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  permHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 8 },
  permHeadCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  permRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  permCell: { fontSize: 13 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

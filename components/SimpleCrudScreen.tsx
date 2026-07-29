import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react-native';
import { AppShell } from '@/components/AppShell';
import {
  usePalette,
  Input,
  Button,
  Card,
  EmptyState,
  ErrorText,
} from '@/components/ui';
import { DataTable, Column } from '@/components/DataTable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TableKey } from '@/types';

interface SelectFromDef {
  table: string;
  valueKey: string;
  labelKeys: string[];
  filterKey?: string;
  filterValueFromField?: string;
  onlyActive?: boolean;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  required?: boolean;
  selectFrom?: SelectFromDef;
}

export interface SimpleCrudScreenProps {
  title: string;
  table: TableKey;
  fields: FieldDef[];
  columns: Column<any>[];
  fetchSelect?: string;
  rowLabel: (r: any) => string;
  hideAddButton?: boolean;
  filter?: Record<string, any>;
  headerExtra?: React.ReactNode;
}

export function SimpleCrudScreen({ 
  title, 
  table, 
  fields, 
  columns, 
  fetchSelect, 
  rowLabel, 
  hideAddButton,
  filter,
  headerExtra
}: SimpleCrudScreenProps) {
  const p = usePalette();
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [options, setOptions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOptions = useCallback(async () => {
    const selectFields = fields.filter((f) => f.selectFrom);
    const opts: Record<string, any[]> = {};
    for (const f of selectFields) {
      const sf = f.selectFrom!;
      let query = supabase.from(sf.table).select('*');
      
      // Automatic Active filtering for Circles & Mozas in forms
      if (sf.onlyActive !== false && (sf.table === 'circles' || sf.table === 'mozas')) {
        query = query.eq('status', true);
      }

      const { data } = await query;
      opts[f.key] = data || [];
    }
    setOptions(opts);
  }, [fields]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from(table).select(fetchSelect || '*');
      
      if (filter) {
        Object.entries(filter).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            query = query.eq(k, v);
          }
        });
      }

      const { data, error: e } = await query;
      if (e) throw e;
      setRows(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [table, fetchSelect, filter]);

  useEffect(() => {
    (async () => {
      await loadOptions();
      await loadRows();
    })();
  }, [loadOptions, loadRows]);

  const openAdd = () => {
    setEditingId(null);
    const blank: Record<string, string> = {};
    fields.forEach((f) => (blank[f.key] = ''));
    setForm(blank);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingId(row.id);
    const f: Record<string, string> = {};
    fields.forEach((fd) => (f[fd.key] = row[fd.key] != null ? String(row[fd.key]) : ''));
    setForm(f);
    setFormError('');
    setModalOpen(true);
  };

  const onDelete = async (row: any) => {
    if (!confirm(`Delete "${rowLabel(row)}"? This may affect related records.`)) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', row.id);
      if (error) throw error;
      loadRows();
    } catch (e: any) {
      alert(e?.message || 'Delete failed.');
    }
  };

  const save = async () => {
    setFormError('');
    for (const f of fields) {
      if (f.required && !form[f.key]) { setFormError(`${f.label} is required.`); return; }
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      fields.forEach((f) => {
        let v: any = form[f.key];
        if (f.selectFrom) v = v || null;
        if (f.keyboardType === 'numeric' && v !== '' && v != null) v = Number(v);
        payload[f.key] = v;
      });
      if (editingId) {
        const { error } = await supabase.from(table).update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      }
      setModalOpen(false);
      loadRows();
    } catch (e: any) {
      setFormError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const allColumns: Column<any>[] = [
    ...columns,
    {
      key: '_actions', label: '', sortable: false, align: 'right',
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end', minWidth: 60 }}>
          {can(table, 'update') ? (
            <TouchableOpacity onPress={() => openEdit(r)} style={[styles.iconBtn, { borderColor: p.border }]}><Pencil size={14} color={p.primary} /></TouchableOpacity>
          ) : null}
          {can(table, 'delete') ? (
            <TouchableOpacity onPress={() => onDelete(r)} style={[styles.iconBtn, { borderColor: p.border }]}><Trash2 size={14} color={p.error} /></TouchableOpacity>
          ) : null}
        </View>
      ),
    },
  ];

  return (
    <AppShell title={title}>
      <View style={{ flex: 1, minHeight: 0 }}>
        {/* Header Actions & Filter Slot */}
        <View style={styles.topActions}>
          <View style={{ marginBottom: 4 }}>
            <Text style={[styles.pageTitle, { color: p.text }]}>{title}</Text>
            <Text style={[styles.pageSub, { color: p.textMuted }]}>{rows.length} record(s)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {headerExtra}
            {can(table, 'insert') && !hideAddButton ? (
              <Button title="Add New" onPress={openAdd} icon={<Plus size={16} color={p.primaryText} />} />
            ) : null}
          </View>
        </View>

        {error ? <View style={{ marginBottom: 12 }}><ErrorText message={error} /></View> : null}

        {/* Scrollable Table Container with Horizontal Scroll support */}
        <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <EmptyState message="Loading..." />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
                <DataTable columns={allColumns} rows={rows} smallHeaders />
              </ScrollView>
            </ScrollView>
          )}
        </Card>
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: p.text }]}>{editingId ? `Edit ${title}` : `Add ${title}`}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={18} color={p.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 10, padding: 4 }}>
              {fields.map((f) => {
                if (f.selectFrom) {
                  const opts = options[f.key] || [];
                  const filtered = f.selectFrom.filterKey && f.selectFrom.filterValueFromField
                    ? opts.filter((o) => !form[f.selectFrom!.filterValueFromField!] || o[f.selectFrom!.filterKey!] === form[f.selectFrom!.filterValueFromField!])
                    : opts;
                  return (
                    <NativeSelect
                      key={f.key}
                      value={form[f.key]}
                      placeholder={f.placeholder}
                      options={filtered.map((o) => ({ value: o.id, label: (f.selectFrom!.labelKeys as string[]).map((k: string) => o[k]).filter(Boolean).join(' - ') }))}
                      onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                    />
                  );
                }
                return (
                  <Input
                    key={f.key}
                    value={form[f.key]}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, [f.key]: t }))}
                    placeholder={f.placeholder}
                    keyboardType={f.keyboardType}
                  />
                );
              })}
              {formError ? <ErrorText message={formError} /> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="ghost" style={{ flex: 1 }} />
                <Button title={editingId ? 'Update' : 'Save'} onPress={save} loading={saving} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

export function NativeSelect({ value, placeholder, options, onChange }: { value: string; placeholder: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  if (Platform.OS === 'web') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: 36,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 8,
          border: `1px solid ${p.border}`,
          backgroundColor: p.inputBg,
          color: value ? p.text : p.textMuted,
          fontSize: 13,
          outline: 'none',
          cursor: 'pointer',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: p.surface, color: p.text }}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.selectWrap, { borderColor: open ? p.primary : p.border, backgroundColor: p.inputBg }]}
        activeOpacity={0.8}
      >
        <Text style={{ color: selected ? p.text : p.textMuted, fontSize: 13, flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={14} color={p.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.pickerCard, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: p.text }}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><X size={16} color={p.textMuted} /></TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }}>
              {options.length === 0 ? <Text style={{ padding: 12, color: p.textMuted, fontSize: 13 }}>No options available</Text> : null}
              {options.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => { onChange(o.value); setOpen(false); }}
                  style={[
                    styles.selectOption,
                    { borderBottomColor: p.border, backgroundColor: selected?.value === o.value ? p.surfaceAlt : 'transparent' }
                  ]}
                >
                  <Text style={{ color: selected?.value === o.value ? p.primary : p.text, fontWeight: selected?.value === o.value ? '700' : '400', fontSize: 13 }}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 520, borderRadius: 14, borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  selectWrap: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minHeight: 38, flexDirection: 'row', alignItems: 'center' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerCard: { width: '100%', maxWidth: 360, borderRadius: 12, borderWidth: 1, padding: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  selectOption: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderRadius: 6 },
});
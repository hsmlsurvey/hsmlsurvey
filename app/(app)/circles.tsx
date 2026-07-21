import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Input, Button, Card, EmptyState, ErrorText } from '@/components/ui';
import { NativeSelect } from '@/components/SimpleCrudScreen';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ZoneNumber, ZoneType, Circle } from '@/types';

type SortKey = 'circle_code' | 'circle_name' | 'zone_number' | 'zone_type';

interface ExtendedCircle extends Circle {
  circle_code?: string;
}

export default function CirclesScreen() {
  const p = usePalette();
  const { can } = useAuth();
  const [rows, setRows] = useState<ExtendedCircle[]>([]);
  const [zoneNumbers, setZoneNumbers] = useState<ZoneNumber[]>([]);
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [circleName, setCircleName] = useState('');
  const [zoneNumberId, setZoneNumberId] = useState('');
  const [zoneTypeId, setZoneTypeId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter States
  const [selectedZoneNumber, setSelectedZoneNumber] = useState<string>('');
  const [selectedZoneType, setSelectedZoneType] = useState<string>('');

  // Sorting state
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, znRes, ztRes, pbRes] = await Promise.all([
        supabase.from('circles').select('*, zone_numbers:zone_number_id(zone_number), zone_types:zone_type_id(zone_type)').order('circle_name'),
        supabase.from('zone_numbers').select('*').order('zone_number'),
        supabase.from('zone_types').select('*').order('zone_type'),
        supabase.from('passbook_entries').select('circle_id, growers(passbook_number)'),
      ]);

      if (cRes.error) throw cRes.error;

      // Map circle_id to first 3 characters of passbook_number
      const codeMap: Record<string, string> = {};
      (pbRes.data || []).forEach((e: any) => {
        const pbNum = e.growers?.passbook_number || e.passbook_number;
        if (e.circle_id && pbNum && !codeMap[e.circle_id]) {
          const code = String(pbNum).trim().substring(0, 3);
          if (code) codeMap[e.circle_id] = code;
        }
      });

      const enrichedRows: ExtendedCircle[] = (cRes.data || []).map((c: any) => ({
        ...c,
        circle_code: c.circle_code || codeMap[c.id] || '-',
      }));

      setRows(enrichedRows);
      setZoneNumbers(znRes.data || []);
      setZoneTypes(ztRes.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sorting Handler
  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  // Filtered Rows (Zone # and Zone Type Filter Logic)
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesZn = !selectedZoneNumber || r.zone_number_id === selectedZoneNumber;
      const matchesZt = !selectedZoneType || r.zone_type_id === selectedZoneType;
      return matchesZn && matchesZt;
    });
  }, [rows, selectedZoneNumber, selectedZoneType]);

  // Memoized Sorted Rows
  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let va = '';
      let vb = '';

      if (sort.key === 'circle_code') {
        va = a.circle_code || '';
        vb = b.circle_code || '';
      } else if (sort.key === 'circle_name') {
        va = a.circle_name || '';
        vb = b.circle_name || '';
      } else if (sort.key === 'zone_number') {
        va = zoneNumbers.find((z) => z.id === a.zone_number_id)?.zone_number || a.zone_numbers?.zone_number || '';
        vb = zoneNumbers.find((z) => z.id === b.zone_number_id)?.zone_number || b.zone_numbers?.zone_number || '';
      } else if (sort.key === 'zone_type') {
        va = zoneTypes.find((z) => z.id === a.zone_type_id)?.zone_type || a.zone_types?.zone_type || '';
        vb = zoneTypes.find((z) => z.id === b.zone_type_id)?.zone_type || b.zone_types?.zone_type || '';
      }

      const cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sort, zoneNumbers, zoneTypes]);

  const openAdd = () => {
    setEditingId(null);
    setCircleName(''); setZoneNumberId(''); setZoneTypeId('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row: ExtendedCircle) => {
    setEditingId(row.id);
    setCircleName(row.circle_name);
    setZoneNumberId(row.zone_number_id || '');
    setZoneTypeId(row.zone_type_id || '');
    setFormError('');
    setModalOpen(true);
  };

  const onDelete = async (row: ExtendedCircle) => {
    if (!confirm(`Delete "${row.circle_name}"?`)) return;
    try {
      const { error } = await supabase.from('circles').delete().eq('id', row.id);
      if (error) throw error;
      load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed.');
    }
  };

  const save = async () => {
    setFormError('');
    if (!circleName.trim()) { setFormError('Circle name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        circle_name: circleName.trim(),
        zone_number_id: zoneNumberId || null,
        zone_type_id: zoneTypeId || null,
      };
      if (editingId) {
        const { error } = await supabase.from('circles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('circles').insert(payload);
        if (error) throw error;
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const updateInline = async (row: ExtendedCircle, field: 'zone_number_id' | 'zone_type_id', value: string) => {
    try {
      const { error } = await supabase.from('circles').update({ [field]: value || null }).eq('id', row.id);
      if (error) throw error;
      load();
    } catch (e: any) {
      alert(e?.message || 'Update failed.');
    }
  };

  const znOpts = zoneNumbers.map((z) => ({ value: z.id, label: z.zone_number }));
  const ztOpts = zoneTypes.map((z) => ({ value: z.id, label: z.zone_type }));

  const filterZnOpts = [{ value: '', label: 'All Zone #' }, ...znOpts];
  const filterZtOpts = [{ value: '', label: 'All Zone Types' }, ...ztOpts];

  const renderSortIcon = (key: SortKey) => {
    if (sort?.key !== key) return null;
    return sort.dir === 'asc' ? (
      <ChevronUp size={14} color={p.primary} />
    ) : (
      <ChevronDown size={14} color={p.primary} />
    );
  };

  return (
    <AppShell title="Circles">
      <View style={{ flex: 1 }}>
        {/* Top Header & Search / Filter Controls */}
        <View style={styles.topActions}>
          <View>
            <Text style={[styles.pageTitle, { color: p.text }]}>Circles</Text>
            <Text style={[styles.pageSub, { color: p.textMuted }]}>{sortedRows.length} record(s)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Zone # Search / Filter */}
            <View style={{ width: 160 }}>
              <NativeSelect
                value={selectedZoneNumber}
                placeholder="All Zone #"
                options={filterZnOpts}
                onChange={(v) => setSelectedZoneNumber(v)}
              />
            </View>

            {/* Zone Type Search / Filter */}
            <View style={{ width: 170 }}>
              <NativeSelect
                value={selectedZoneType}
                placeholder="All Zone Types"
                options={filterZtOpts}
                onChange={(v) => setSelectedZoneType(v)}
              />
            </View>

            {can('circles', 'insert') ? (
              <Button title="Add New" onPress={openAdd} icon={<Plus size={16} color={p.primaryText} />} />
            ) : null}
          </View>
        </View>

        {error ? <View style={{ marginBottom: 12 }}><ErrorText message={error} /></View> : null}

        <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {loading ? <EmptyState message="Loading..." /> : (
            <ScrollView horizontal={false} style={{ flex: 1 }}>
              {/* Table Header */}
              <View style={[styles.headerRow, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
                <Text style={[styles.headCell, { color: p.textMuted, width: 60 }]}>S.#</Text>

                {/* Circle Code Header */}
                <TouchableOpacity
                  onPress={() => toggleSort('circle_code')}
                  style={[styles.sortHeadCell, { width: 110 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.headCell, { color: sort?.key === 'circle_code' ? p.primary : p.textMuted }]}>
                    Circle Code
                  </Text>
                  {renderSortIcon('circle_code')}
                </TouchableOpacity>

                {/* Circle Name Header */}
                <TouchableOpacity
                  onPress={() => toggleSort('circle_name')}
                  style={[styles.sortHeadCell, { width: 200 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.headCell, { color: sort?.key === 'circle_name' ? p.primary : p.textMuted }]}>Circle</Text>
                  {renderSortIcon('circle_name')}
                </TouchableOpacity>

                {/* Zone # Header */}
                <TouchableOpacity
                  onPress={() => toggleSort('zone_number')}
                  style={[styles.sortHeadCell, { width: 180 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.headCell, { color: sort?.key === 'zone_number' ? p.primary : p.textMuted }]}>Zone #</Text>
                  {renderSortIcon('zone_number')}
                </TouchableOpacity>

                {/* Zone Type Header */}
                <TouchableOpacity
                  onPress={() => toggleSort('zone_type')}
                  style={[styles.sortHeadCell, { width: 180 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.headCell, { color: sort?.key === 'zone_type' ? p.primary : p.textMuted }]}>Zone Type</Text>
                  {renderSortIcon('zone_type')}
                </TouchableOpacity>

                <Text style={[styles.headCell, { color: p.textMuted, width: 80, textAlign: 'right' }]}>Actions</Text>
              </View>

              {/* Rows */}
              {sortedRows.length === 0 ? (
                <EmptyState message="No circles found." />
              ) : (
                sortedRows.map((row, idx) => (
                  <View 
                    key={row.id} 
                    style={[
                      styles.dataRow, 
                      { 
                        borderBottomColor: p.border, 
                        backgroundColor: idx % 2 === 0 ? p.surface : p.surfaceAlt,
                        zIndex: sortedRows.length - idx 
                      }
                    ]}
                  >
                    {/* Serial Number */}
                    <View style={{ width: 60, paddingHorizontal: 8, justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '600', color: p.text, fontSize: 13 }}>{idx + 1}</Text>
                    </View>

                    {/* Circle Code */}
                    <View style={{ width: 110, paddingHorizontal: 8, justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '700', color: p.primary, fontSize: 13 }}>
                        {row.circle_code || '-'}
                      </Text>
                    </View>

                    {/* Circle Name */}
                    <View style={{ width: 200, paddingHorizontal: 8, justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '700', color: p.text, fontSize: 13 }}>{row.circle_name}</Text>
                    </View>

                    {/* Inline Zone # Selection */}
                    <View style={{ width: 180, paddingHorizontal: 4, paddingVertical: 4, zIndex: 2 }}>
                      {can('circles', 'update') ? (
                        <NativeSelect
                          value={row.zone_number_id || ''}
                          placeholder="Zone #"
                          options={znOpts}
                          onChange={(v) => updateInline(row, 'zone_number_id', v)}
                        />
                      ) : (
                        <Text style={{ color: p.text, fontSize: 13 }}>{row.zone_numbers?.zone_number || '-'}</Text>
                      )}
                    </View>

                    {/* Inline Zone Type Selection */}
                    <View style={{ width: 180, paddingHorizontal: 4, paddingVertical: 4, zIndex: 1 }}>
                      {can('circles', 'update') ? (
                        <NativeSelect
                          value={row.zone_type_id || ''}
                          placeholder="Zone Type"
                          options={ztOpts}
                          onChange={(v) => updateInline(row, 'zone_type_id', v)}
                        />
                      ) : (
                        <Text style={{ color: p.text, fontSize: 13 }}>{row.zone_types?.zone_type || '-'}</Text>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={{ width: 80, flexDirection: 'row', gap: 6, justifyContent: 'flex-end', paddingHorizontal: 4, alignItems: 'center' }}>
                      {can('circles', 'update') ? (
                        <TouchableOpacity onPress={() => openEdit(row)} style={[styles.iconBtn, { borderColor: p.border }]}><Pencil size={14} color={p.primary} /></TouchableOpacity>
                      ) : null}
                      {can('circles', 'delete') ? (
                        <TouchableOpacity onPress={() => onDelete(row)} style={[styles.iconBtn, { borderColor: p.border }]}><Trash2 size={14} color={p.error} /></TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </Card>
      </View>

      {/* Modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: p.text }]}>{editingId ? 'Edit Circle' : 'Add Circle'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={18} color={p.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 10, padding: 4 }}>
              <Input value={circleName} onChangeText={setCircleName} placeholder="Circle Name" />
              <NativeSelect value={zoneNumberId} placeholder="Select Zone #" options={znOpts} onChange={setZoneNumberId} />
              <NativeSelect value={zoneTypeId} placeholder="Select Zone Type" options={ztOpts} onChange={setZoneTypeId} />
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

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: 2 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  headCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sortHeadCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 520, borderRadius: 14, borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
});
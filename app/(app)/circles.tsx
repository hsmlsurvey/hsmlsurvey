import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Switch, Platform } from 'react-native';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Input, Button, Card, EmptyState, ErrorText } from '@/components/ui';
import { NativeSelect } from '@/components/SimpleCrudScreen';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ZoneNumber, ZoneType, Circle } from '@/types';

type SortKey = 'circle_code' | 'circle_name' | 'zone_number' | 'zone_type' | 'status';

interface ExtendedCircle extends Circle {
  circle_code?: string;
  status?: boolean;
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
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter States
  const [selectedZoneNumber, setSelectedZoneNumber] = useState<string>('');
  const [selectedZoneType, setSelectedZoneType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

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
        status: c.status ?? true,
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

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesZn = !selectedZoneNumber || r.zone_number_id === selectedZoneNumber;
      const matchesZt = !selectedZoneType || r.zone_type_id === selectedZoneType;
      
      let matchesStatus = true;
      if (selectedStatus === 'active') matchesStatus = r.status === true;
      if (selectedStatus === 'inactive') matchesStatus = r.status === false;

      return matchesZn && matchesZt && matchesStatus;
    });
  }, [rows, selectedZoneNumber, selectedZoneType, selectedStatus]);

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
      } else if (sort.key === 'status') {
        va = a.status ? 'Active' : 'Inactive';
        vb = b.status ? 'Active' : 'Inactive';
      }

      const cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sort, zoneNumbers, zoneTypes]);

  const openAdd = () => {
    setEditingId(null);
    setCircleName(''); setZoneNumberId(''); setZoneTypeId('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row: ExtendedCircle) => {
    setEditingId(row.id);
    setCircleName(row.circle_name);
    setZoneNumberId(row.zone_number_id || '');
    setZoneTypeId(row.zone_type_id || '');
    setIsActive(row.status ?? true);
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
        status: isActive,
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

  const updateInline = async (row: ExtendedCircle, field: 'zone_number_id' | 'zone_type_id' | 'status', value: any) => {
    try {
      const valToSave = field === 'status' 
        ? (typeof value === 'boolean' ? value : value === 'true') 
        : (value || null);
        
      const { error } = await supabase.from('circles').update({ [field]: valToSave }).eq('id', row.id);
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

  const filterStatusOpts = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

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
        {/* Responsive Header Actions */}
        <View style={styles.topContainer}>
          <View style={styles.titleSection}>
            <Text style={[styles.pageTitle, { color: p.text }]}>Circles</Text>
            <Text style={[styles.pageSub, { color: p.textMuted }]}>{sortedRows.length} record(s)</Text>
          </View>

          <View style={styles.filterBar}>
            <View style={styles.filterItem}>
              <NativeSelect
                value={selectedStatus}
                placeholder="Status"
                options={filterStatusOpts}
                onChange={(v) => setSelectedStatus(v)}
              />
            </View>

            <View style={styles.filterItem}>
              <NativeSelect
                value={selectedZoneNumber}
                placeholder="All Zone #"
                options={filterZnOpts}
                onChange={(v) => setSelectedZoneNumber(v)}
              />
            </View>

            <View style={styles.filterItem}>
              <NativeSelect
                value={selectedZoneType}
                placeholder="All Zone Types"
                options={filterZtOpts}
                onChange={(v) => setSelectedZoneType(v)}
              />
            </View>

            {can('circles', 'insert') ? (
              <View style={styles.addButtonContainer}>
                <Button title="Add New" onPress={openAdd} icon={<Plus size={16} color={p.primaryText} />} />
              </View>
            ) : null}
          </View>
        </View>

        {error ? <View style={{ marginBottom: 12 }}><ErrorText message={error} /></View> : null}

        {/* Responsive Scrollable Table Container */}
        <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <EmptyState message="Loading..." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
              <View style={{ minWidth: 840, flex: 1 }}>
                <ScrollView style={{ flex: 1 }}>
                  {/* Table Header */}
                  <View style={[styles.headerRow, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
                    <Text style={[styles.headCell, { color: p.textMuted, width: 50 }]}>S.#</Text>

                    <TouchableOpacity
                      onPress={() => toggleSort('circle_code')}
                      style={[styles.sortHeadCell, { width: 100 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.headCell, { color: sort?.key === 'circle_code' ? p.primary : p.textMuted }]}>
                        Circle Code
                      </Text>
                      {renderSortIcon('circle_code')}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleSort('circle_name')}
                      style={[styles.sortHeadCell, { width: 180 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.headCell, { color: sort?.key === 'circle_name' ? p.primary : p.textMuted }]}>Circle</Text>
                      {renderSortIcon('circle_name')}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleSort('zone_number')}
                      style={[styles.sortHeadCell, { width: 150 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.headCell, { color: sort?.key === 'zone_number' ? p.primary : p.textMuted }]}>Zone #</Text>
                      {renderSortIcon('zone_number')}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleSort('zone_type')}
                      style={[styles.sortHeadCell, { width: 150 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.headCell, { color: sort?.key === 'zone_type' ? p.primary : p.textMuted }]}>Zone Type</Text>
                      {renderSortIcon('zone_type')}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleSort('status')}
                      style={[styles.sortHeadCell, { width: 130 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.headCell, { color: sort?.key === 'status' ? p.primary : p.textMuted }]}>Status</Text>
                      {renderSortIcon('status')}
                    </TouchableOpacity>

                    <Text style={[styles.headCell, { color: p.textMuted, width: 80, textAlign: 'right' }]}>Actions</Text>
                  </View>

                  {/* Table Rows */}
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
                        <View style={{ width: 50, paddingHorizontal: 8, justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '600', color: p.text, fontSize: 13 }}>{idx + 1}</Text>
                        </View>

                        <View style={{ width: 100, paddingHorizontal: 8, justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '700', color: p.primary, fontSize: 13 }}>
                            {row.circle_code || '-'}
                          </Text>
                        </View>

                        <View style={{ width: 180, paddingHorizontal: 8, justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '700', color: p.text, fontSize: 13 }}>{row.circle_name}</Text>
                        </View>

                        <View style={{ width: 150, paddingHorizontal: 4, paddingVertical: 4, zIndex: 3 }}>
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

                        <View style={{ width: 150, paddingHorizontal: 4, paddingVertical: 4, zIndex: 2 }}>
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

                        <View style={{ width: 130, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {can('circles', 'update') ? (
                            <>
                              <Switch
                                value={row.status ?? true}
                                onValueChange={(val) => updateInline(row, 'status', val)}
                                trackColor={{ false: p.border, true: p.primarySoft }}
                                thumbColor={Platform.OS === 'ios' ? undefined : ((row.status ?? true) ? p.primary : p.textMuted)}
                                ios_backgroundColor={p.border}
                              />
                              <Text style={{ color: row.status ? p.primary : p.error, fontWeight: '600', fontSize: 12 }}>
                                {row.status ? 'Active' : 'Inactive'}
                              </Text>
                            </>
                          ) : (
                            <Text style={{ color: row.status ? p.primary : p.error, fontWeight: '600', fontSize: 13 }}>
                              {row.status ? 'Active' : 'Inactive'}
                            </Text>
                          )}
                        </View>

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
              </View>
            </ScrollView>
          )}
        </Card>
      </View>

      {/* Modal Form */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: p.text }]}>{editingId ? 'Edit Circle' : 'Add Circle'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={18} color={p.textMuted} /></TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 12, padding: 4 }}>
              <Input value={circleName} onChangeText={setCircleName} placeholder="Circle Name" />
              <NativeSelect value={zoneNumberId} placeholder="Select Zone #" options={znOpts} onChange={setZoneNumberId} />
              <NativeSelect value={zoneTypeId} placeholder="Select Zone Type" options={ztOpts} onChange={setZoneTypeId} />
              
              <View style={[styles.toggleContainer, { borderColor: p.border, backgroundColor: p.surfaceAlt }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.toggleLabel, { color: p.text }]}>Circle Status</Text>
                  <Text style={{ fontSize: 12, color: isActive ? p.primary : p.error, fontWeight: '600' }}>
                    {isActive ? 'Active (Will show in reports)' : 'Inactive (Will be hidden)'}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: p.border, true: p.primarySoft }}
                  thumbColor={Platform.OS === 'ios' ? undefined : (isActive ? p.primary : p.textMuted)}
                  ios_backgroundColor={p.border}
                />
              </View>

              {formError ? <ErrorText message={formError} /> : null}
              
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
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
  topContainer: { marginBottom: 16, gap: 12 },
  titleSection: { marginBottom: 4 },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: 2 },
  filterBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  filterItem: { flex: 1, minWidth: 130 },
  addButtonContainer: { minWidth: 110 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  headCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sortHeadCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, borderRadius: 14, borderWidth: 1, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  toggleContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    marginTop: 4 
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
});
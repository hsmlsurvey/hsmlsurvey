import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
import { SimpleCrudScreen, NativeSelect } from '@/components/SimpleCrudScreen';
import { usePalette, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';

// Helper function: Circle active status check
const isActiveStatus = (item: any): boolean => {
  if (!item) return false;
  if (item.status !== undefined && item.status !== null) {
    if (typeof item.status === 'boolean') return item.status;
    const s = String(item.status).trim().toLowerCase();
    return s === 'active' || s === '1' || s === 'true' || s === 'a';
  }
  return true;
};

export default function MozasScreen() {
  const p = usePalette();
  // Active circles for top filter dropdown
  const [activeCircleOpts, setActiveCircleOpts] = useState<{ value: string; label: string }[]>([]);
  // All circles for table row dropdown
  const [allCircleOpts, setAllCircleOpts] = useState<{ value: string; label: string }[]>([]);
  
  // Store the exact status value from DB for active circles
  const [activeDbStatus, setActiveDbStatus] = useState<any>(null);

  const [mozaCodeMap, setMozaCodeMap] = useState<Record<string, string>>({});
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [circleSearchText, setCircleSearchText] = useState<string>('');

  useEffect(() => {
    // Fetch all circles sorted by circle_code
    supabase
      .from('circles')
      .select('id, circle_code, circle_name, status')
      .order('circle_code', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching circles:', error);
          return;
        }
        const circlesList = data || [];

        // 1. All circle options for table row editing
        const allOpts = circlesList.map((c: any) => ({
          value: String(c.id),
          label: c.circle_code 
            ? `${c.circle_code} - ${c.circle_name}${!isActiveStatus(c) ? ' (Inactive)' : ''}`
            : `${c.circle_name}${!isActiveStatus(c) ? ' (Inactive)' : ''}`,
        }));
        setAllCircleOpts(allOpts);

        // 2. Active circle options only for top filter dropdown
        const activeCircles = circlesList.filter(isActiveStatus);
        
        // Save the exact DB status value (e.g., 'active', '1', or true)
        if (activeCircles.length > 0) {
          setActiveDbStatus(activeCircles[0].status);
        }

        const activeOpts = activeCircles.map((c: any) => ({
          value: String(c.id),
          label: c.circle_code ? `${c.circle_code} - ${c.circle_name}` : c.circle_name,
        }));
        setActiveCircleOpts(activeOpts);
      });

    // Passbook Entries Map
    supabase
      .from('passbook_entries')
      .select('moza_id, growers(passbook_number)')
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((e: any) => {
          const pbNum = e.growers?.passbook_number || e.passbook_number;
          if (e.moza_id && pbNum && !map[e.moza_id]) {
            const code = String(pbNum).trim().substring(0, 6);
            if (code) map[e.moza_id] = code;
          }
        });
        setMozaCodeMap(map);
      });
  }, []);

  const updateCircle = async (id: string, circle_id: string) => {
    try {
      const { error } = await supabase.from('mozas').update({ circle_id: circle_id || null }).eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update circle');
    }
  };

  // Search filter for top circle dropdown
  const filteredCircleOpts = useMemo(() => {
    if (!circleSearchText.trim()) return activeCircleOpts;
    return activeCircleOpts.filter((c) =>
      c.label.toLowerCase().includes(circleSearchText.toLowerCase())
    );
  }, [activeCircleOpts, circleSearchText]);

  const filterDropdownOptions = [
    { value: '', label: 'All Circles' },
    ...filteredCircleOpts,
  ];

  // Mozas Filter logic:
  // - Specific circle selected -> Filter by `circle_id`
  // - "All Circles" selected -> Filter dynamically using DB's active status value
  const currentFilter = useMemo(() => {
    if (selectedCircle) {
      return { circle_id: selectedCircle };
    }
    if (activeDbStatus !== null && activeDbStatus !== undefined) {
      return { 'circles.status': activeDbStatus };
    }
    return undefined;
  }, [selectedCircle, activeDbStatus]);

  return (
    <SimpleCrudScreen
      title="Mozas"
      table="mozas"
      rowLabel={(r: any) => r.moza_name}
      filter={currentFilter}
      headerExtra={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, alignItems: 'center' }}>
          <View style={{ width: 220, maxWidth: '100%' }}>
            <Input
              placeholder="Search Circle..."
              value={circleSearchText}
              onChangeText={setCircleSearchText}
            />
          </View>
          <View style={{ width: 260, maxWidth: '100%' }}>
            <NativeSelect
              value={selectedCircle}
              placeholder="All Circles"
              options={filterDropdownOptions}
              onChange={setSelectedCircle}
            />
          </View>
        </View>
      }
      fields={[
        {
          key: 'circle_id',
          label: 'Circle',
          placeholder: 'Select Circle',
          required: true,
          selectFrom: { table: 'circles', valueKey: 'id', labelKeys: ['circle_name'] },
        },
        { key: 'moza_name', label: 'Moza', placeholder: 'Moza Name', required: true },
      ]}
      // Inner join with circles table to filter inactive circles out
      fetchSelect="*, circles!inner(id, circle_code, circle_name, status)"
      columns={[
        {
          key: 's_no',
          label: 'S.#',
          width: 45,
          render: (_: any, i: number) => <Text style={{ fontWeight: '600', color: p.text }}>{i + 1}</Text>,
        },
        {
          key: 'moza_code',
          label: 'Moza Code',
          width: 95,
          render: (r: any) => (
            <Text style={{ fontWeight: '700', color: p.primary, fontSize: 13 }}>
              {r.moza_code || mozaCodeMap[r.id] || '-'}
            </Text>
          ),
        },
        {
          key: 'moza_name',
          label: 'Moza',
          width: 140,
          render: (r: any) => <Text style={{ fontWeight: '700', color: p.text }}>{r.moza_name}</Text>,
        },
        {
          key: 'circle_id',
          label: 'Circle',
          width: 230,
          render: (r: any) => (
            <NativeSelect
              value={r.circle_id || ''}
              placeholder="Select Circle"
              options={allCircleOpts}
              onChange={(v) => updateCircle(r.id, v)}
            />
          ),
        },
      ]}
    />
  );
}
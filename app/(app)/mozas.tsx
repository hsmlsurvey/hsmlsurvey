import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
import { SimpleCrudScreen, NativeSelect } from '@/components/SimpleCrudScreen';
import { usePalette, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function MozasScreen() {
  const p = usePalette();
  const [circleOpts, setCircleOpts] = useState<{ value: string; label: string }[]>([]);
  const [mozaCodeMap, setMozaCodeMap] = useState<Record<string, string>>({});
  
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [circleSearchText, setCircleSearchText] = useState<string>('');

  useEffect(() => {
    supabase
      .from('circles')
      .select('id, circle_name')
      .order('circle_name', { ascending: true })
      .then(({ data }) => setCircleOpts(data?.map((c) => ({ value: c.id, label: c.circle_name })) || []));

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

  const filteredCircleOpts = useMemo(() => {
    if (!circleSearchText.trim()) return circleOpts;
    return circleOpts.filter((c) =>
      c.label.toLowerCase().includes(circleSearchText.toLowerCase())
    );
  }, [circleOpts, circleSearchText]);

  const filterDropdownOptions = [
    { value: '', label: 'All Circles' },
    ...filteredCircleOpts,
  ];

  return (
    <SimpleCrudScreen
      title="Mozas"
      table="mozas"
      rowLabel={(r) => r.moza_name}
      filter={selectedCircle ? { circle_id: selectedCircle } : undefined}
      headerExtra={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 180 }}>
            <Input
              placeholder="Search Circle..."
              value={circleSearchText}
              onChangeText={(t) => setCircleSearchText(t)}
            />
          </View>
          <View style={{ width: 160 }}>
            <NativeSelect
              value={selectedCircle}
              placeholder="All Circles"
              options={filterDropdownOptions}
              onChange={(v) => setSelectedCircle(v)}
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
      fetchSelect="*, circles:circle_id(circle_name)"
      columns={[
        {
          key: 's_no',
          label: 'S.#',
          width: 60,
          render: (_, i) => <Text style={{ fontWeight: '600', color: p.text }}>{i + 1}</Text>,
        },
        {
          key: 'moza_code',
          label: 'Moza Code',
          width: 120,
          render: (r) => (
            <Text style={{ fontWeight: '700', color: p.primary, fontSize: 13 }}>
              {r.moza_code || mozaCodeMap[r.id] || '-'}
            </Text>
          ),
        },
        {
          key: 'moza_name',
          label: 'Moza',
          width: 220,
          render: (r) => <Text style={{ fontWeight: '700', color: p.text }}>{r.moza_name}</Text>,
        },
        {
          key: 'circle_id',
          label: 'Circle',
          width: 220,
          render: (r) => (
            <NativeSelect
              value={r.circle_id || ''}
              placeholder="Select Circle"
              options={circleOpts}
              onChange={(v) => updateCircle(r.id, v)}
            />
          ),
        },
      ]}
    />
  );
}
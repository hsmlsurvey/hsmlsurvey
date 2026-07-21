import React from 'react';
import { Text } from 'react-native';
import { SimpleCrudScreen } from '@/components/SimpleCrudScreen';
import { usePalette } from '@/components/ui';

export default function ZoneNumbersScreen() {
  const p = usePalette();
  return (
    <SimpleCrudScreen
      title="Zone Numbers"
      table="zone_numbers"
      rowLabel={(r: any) => r.zone_number}
      fields={[
        { key: 'zone_number', label: 'Zone #', placeholder: 'Zone #', required: true },
      ]}
      columns={[
        { 
          key: 's_no', 
          label: 'S.#', 
          width: 70, 
          render: (r: any, index?: number) => (
            <Text style={{ fontWeight: '600', color: p.text }}>
              {typeof index === 'number' ? index + 1 : '-'}
            </Text>
          ) 
        },
        { 
          key: 'zone_number', 
          label: 'Zone #', 
          width: 200, 
          render: (r: any) => (
            <Text style={{ fontWeight: '700', color: p.text }}>{r.zone_number}</Text>
          ) 
        },
      ]}
    />
  );
}
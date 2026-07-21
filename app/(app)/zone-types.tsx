import React from 'react';
import { Text } from 'react-native';
import { SimpleCrudScreen } from '@/components/SimpleCrudScreen';
import { usePalette } from '@/components/ui';

export default function ZoneTypesScreen() {
  const p = usePalette();
  return (
    <SimpleCrudScreen
      title="Zone Types"
      table="zone_types"
      rowLabel={(r: any) => r.zone_type}
      fields={[
        { key: 'zone_type', label: 'Zone Type', placeholder: 'Zone Type', required: true },
      ]}
      columns={[
        { 
          key: 's_no', 
          label: 'S.#', 
          width: 70, 
          render: (_: any, index: number) => (
            <Text style={{ fontWeight: '600', color: p.text }}>
              {index + 1}
            </Text>
          ) 
        },
        { 
          key: 'zone_type', 
          label: 'Zone Type', 
          width: 200, 
          render: (r: any) => (
            <Text style={{ fontWeight: '700', color: p.text }}>{r.zone_type}</Text>
          ) 
        },
      ]}
    />
  );
}
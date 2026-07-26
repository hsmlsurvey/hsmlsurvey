import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Filter, Search } from 'lucide-react-native';
import { usePalette, Input, Button, Card } from '@/components/ui';
import { NativeSelect } from '@/components/SimpleCrudScreen';
import { supabase } from '@/lib/supabase';
import { ZoneNumber, ZoneType, Circle, Moza } from '@/types';

function num(v: any): number {
  return Number(v ?? 0);
}

// Clean "Zone " or "zone " prefix for standard matching
export function cleanZone(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/^zone\s*/i, '').trim();
}

export interface FlatRow {
  entry_id: string;
  master_passbook: string; // Updated field for exact matching
  passbook_number: string;
  grower_name: string;
  father_name: string | null;
  cnic: string | null;
  cell: string | null;
  bank_title: string | null;
  bank_account: string | null;
  transport_type: string | null;
  survey: string | null;
  zone_number_id: string | null;
  zone_number: string | null;
  zone_type_id: string | null;
  zone_type: string | null;
  circle_id: string | null;
  circle_code?: string | null;
  circle_name: string | null;
  moza_id: string | null;
  moza_code?: string | null;
  moza_name: string | null;
  variety_mondha: number;
  variety_sanma: number;
  non_variety_mondha: number;
  non_variety_sanma: number;
  total_acre: number;
  total_mondha: number;
  total_sanma: number;
  grand_total: number;
}

export function useReportData() {
  const [rows, setRows] = useState<FlatRow[]>([]);
  const [zoneNumbers, setZoneNumbers] = useState<ZoneNumber[]>([]);
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [mozas, setMozas] = useState<Moza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [znRes, ztRes, cRes, mRes] = await Promise.all([
        supabase.from('zone_numbers').select('*'),
        supabase.from('zone_types').select('*'),
        supabase.from('circles').select('*'),
        supabase.from('mozas').select('*'),
      ]);
      const zns = znRes.data || [];
      const zts = ztRes.data || [];
      const cs = cRes.data || [];
      const ms = mRes.data || [];
      setZoneNumbers(zns);
      setZoneTypes(zts);
      setCircles(cs);
      setMozas(ms);

      // Fetch ALL records in batches of 1000
      let allPassbookData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: e } = await supabase
          .from('passbook_entries')
          .select(`
            id, grower_id, master_passbook, zone_number_id, zone_type_id, circle_id, moza_id, survey,
            variety_mondha, variety_sanma, non_variety_mondha, non_variety_sanma, total_acre,
            growers ( id, master_passbook, passbook_number, grower_name, father_name, cnic, cell, bank_title, bank_account, transport_type )
          `)
          .range(from, from + step - 1);

        if (e) throw e;

        if (data && data.length > 0) {
          allPassbookData = allPassbookData.concat(data);
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      const flat: FlatRow[] = allPassbookData.map((r: any) => {
        const g = r.growers;
        const zn = zns.find((z) => String(z.id) === String(r.zone_number_id));
        const zt = zts.find((z) => String(z.id) === String(r.zone_type_id));
        const circle = cs.find((c) => String(c.id) === String(r.circle_id));
        const moza = ms.find((m) => String(m.id) === String(r.moza_id));
        const vm = num(r.variety_mondha),
          vs = num(r.variety_sanma);
        const nvm = num(r.non_variety_mondha),
          nvs = num(r.non_variety_sanma);

        // Fallback to check master_passbook from passbook_entries, growers, or grower_id
        const mp = String(r.master_passbook || g?.master_passbook || r.grower_id || '').trim();

        return {
          entry_id: r.id,
          master_passbook: mp,
          passbook_number: g?.passbook_number || mp,
          grower_name: g?.grower_name || '',
          father_name: g?.father_name || null,
          cnic: g?.cnic || null,
          cell: g?.cell || null,
          bank_title: g?.bank_title || null,
          bank_account: g?.bank_account || null,
          transport_type: g?.transport_type || null,
          survey: r.survey,
          zone_number_id: r.zone_number_id,
          zone_number: zn?.zone_number ? cleanZone(zn.zone_number) : null,
          zone_type_id: r.zone_type_id,
          zone_type: zt?.zone_type || null,
          circle_id: r.circle_id,
          circle_code: (circle as any)?.circle_code || null,
          circle_name: circle?.circle_name || null,
          moza_id: r.moza_id,
          moza_code: (moza as any)?.moza_code || null,
          moza_name: moza?.moza_name || null,
          variety_mondha: vm,
          variety_sanma: vs,
          non_variety_mondha: nvm,
          non_variety_sanma: nvs,
          total_acre: num(r.total_acre),
          total_mondha: vm + nvm,
          total_sanma: vs + nvs,
          grand_total: vm + nvm + vs + nvs,
        };
      });
      setRows(flat);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, zoneNumbers, zoneTypes, circles, mozas, loading, error };
}

export interface ReportFilters {
  zoneNumber: string;
  zoneType: string;
  circleNumber: string;
  mozaNumber: string;
  fromAcre: string;
  toAcre: string;
}

export const emptyFilters: ReportFilters = {
  zoneNumber: '',
  zoneType: '',
  circleNumber: '',
  mozaNumber: '',
  fromAcre: '',
  toAcre: '',
};

export function ReportFilterBar({
  filters,
  setFilters,
  onRun,
  zoneNumbers,
  zoneTypes,
  circles,
  mozas,
  showAcreRange = false,
}: {
  filters: ReportFilters;
  setFilters: (f: ReportFilters) => void;
  onRun: () => void;
  zoneNumbers: ZoneNumber[];
  zoneTypes: ZoneType[];
  circles: Circle[];
  mozas: Moza[];
  showAcreRange?: boolean;
}) {
  const p = usePalette();
  const zoneOpts = zoneNumbers.map((z) => {
    const c = cleanZone(z.zone_number);
    return { value: c, label: `Zone ${c}` };
  });
  const zoneTypeOpts = zoneTypes.map((z) => ({ value: z.zone_type, label: z.zone_type }));
  const circleOpts = circles.map((c) => ({ value: c.circle_name, label: c.circle_name }));
  const mozaOpts = mozas.map((m) => ({ value: m.moza_name, label: m.moza_name }));

  return (
    <Card style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Filter size={16} color={p.primary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: p.text }}>Filters</Text>
        <Text style={{ fontSize: 12, color: p.textMuted }}>— leave blank to include all</Text>
      </View>
      <View style={styles.grid}>
        <View style={{ minWidth: 180, zIndex: 5000 }}>
          <NativeSelect
            value={cleanZone(filters.zoneNumber)}
            placeholder="Zone #"
            options={zoneOpts}
            onChange={(v) => setFilters({ ...filters, zoneNumber: v })}
          />
        </View>
        <View style={{ minWidth: 180, zIndex: 4990 }}>
          <NativeSelect
            value={filters.zoneType}
            placeholder="Zone Type"
            options={zoneTypeOpts}
            onChange={(v) => setFilters({ ...filters, zoneType: v })}
          />
        </View>
        <View style={{ minWidth: 180, zIndex: 4980 }}>
          <NativeSelect
            value={filters.circleNumber}
            placeholder="Circle #"
            options={circleOpts}
            onChange={(v) => setFilters({ ...filters, circleNumber: v })}
          />
        </View>
        <View style={{ minWidth: 180, zIndex: 4970 }}>
          <NativeSelect
            value={filters.mozaNumber}
            placeholder="Moza #"
            options={mozaOpts}
            onChange={(v) => setFilters({ ...filters, mozaNumber: v })}
          />
        </View>
        {showAcreRange ? (
          <>
            <View style={{ minWidth: 140 }}>
              <Input
                value={filters.fromAcre}
                onChangeText={(t) => setFilters({ ...filters, fromAcre: t })}
                placeholder="From Acre"
                keyboardType="numeric"
              />
            </View>
            <View style={{ minWidth: 140 }}>
              <Input
                value={filters.toAcre}
                onChangeText={(t) => setFilters({ ...filters, toAcre: t })}
                placeholder="To Acre"
                keyboardType="numeric"
              />
            </View>
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: p.border }}>
        <Button title="Run Report" onPress={onRun} icon={<Search size={16} color={p.primaryText} />} />
        <Button title="Clear" variant="ghost" onPress={() => setFilters({ ...emptyFilters })} />
      </View>
    </Card>
  );
}

export function applyFilters(rows: FlatRow[], f: ReportFilters): FlatRow[] {
  let r = rows;
  if (f.zoneNumber) {
    const tz = cleanZone(f.zoneNumber);
    r = r.filter((x) => cleanZone(x.zone_number) === tz);
  }
  if (f.zoneType) {
    const tt = f.zoneType.toLowerCase().trim();
    r = r.filter((x) => String(x.zone_type || '').toLowerCase().trim() === tt);
  }
  if (f.circleNumber) {
    r = r.filter((x) => x.circle_name === f.circleNumber || String(x.circle_id) === String(f.circleNumber));
  }
  if (f.mozaNumber) {
    r = r.filter((x) => x.moza_name === f.mozaNumber || String(x.moza_id) === String(f.mozaNumber));
  }
  if (f.fromAcre) r = r.filter((x) => x.total_acre >= num(f.fromAcre));
  if (f.toAcre) r = r.filter((x) => x.total_acre <= num(f.toAcre));
  return r;
}

export const VARIETY_HEADERS = ['Growers', 'V.M', 'V.S', 'T.V', 'NV.M', 'NV.S', 'T.NV', 'T.M', 'T.S', 'G Total'];

export interface VarietyAgg {
  growers: Set<string>;
  varietyMondha: number;
  varietySanma: number;
  nonVarietyMondha: number;
  nonVarietySanma: number;
}

export function newAgg(): VarietyAgg {
  return { growers: new Set(), varietyMondha: 0, varietySanma: 0, nonVarietyMondha: 0, nonVarietySanma: 0 };
}

// FIX: Strictly using master_passbook for unique grower counting
export function addRow(a: VarietyAgg, r: FlatRow) {
  const passbookKey = r.master_passbook || r.passbook_number || r.grower_name;
  if (passbookKey) {
    a.growers.add(String(passbookKey).trim());
  }
  a.varietyMondha += r.variety_mondha;
  a.varietySanma += r.variety_sanma;
  a.nonVarietyMondha += r.non_variety_mondha;
  a.nonVarietySanma += r.non_variety_sanma;
}

export function aggCells(a: VarietyAgg): string[] {
  const tv = a.varietyMondha + a.varietySanma;
  const tnv = a.nonVarietyMondha + a.nonVarietySanma;
  const tm = a.varietyMondha + a.nonVarietyMondha;
  const ts = a.varietySanma + a.nonVarietySanma;
  const gt = tm + ts;
  return [
    String(a.growers.size),
    a.varietyMondha.toFixed(2),
    a.varietySanma.toFixed(2),
    tv.toFixed(2),
    a.nonVarietyMondha.toFixed(2),
    a.nonVarietySanma.toFixed(2),
    tnv.toFixed(2),
    tm.toFixed(2),
    ts.toFixed(2),
    gt.toFixed(2),
  ];
}

export function combineAgg(a: VarietyAgg, b: VarietyAgg): VarietyAgg {
  const c = newAgg();
  a.growers.forEach((g) => c.growers.add(g));
  b.growers.forEach((g) => c.growers.add(g));
  c.varietyMondha = a.varietyMondha + b.varietyMondha;
  c.varietySanma = a.varietySanma + b.varietySanma;
  c.nonVarietyMondha = a.nonVarietyMondha + b.nonVarietyMondha;
  c.nonVarietySanma = a.nonVarietySanma + b.nonVarietySanma;
  return c;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
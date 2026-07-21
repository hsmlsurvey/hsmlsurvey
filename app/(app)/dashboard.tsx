import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Input, Button, Card, SectionTitle, EmptyState, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { VARIETY_HEADERS, VarietyAgg, newAgg, aggCells } from '@/components/ReportCommon';

interface GrowerRow {
  id: string;
  passbook_number: string;
  master_passbook: string | null;
  grower_name: string;
  father_name: string | null;
  cnic: string | null;
  cell: string | null;
  bank_title: string | null;
  bank_account: string | null;
  transport_type: string | null;
}

interface EntryRow {
  id: string;
  grower_id: string;
  moza_id: string | null;
  circle_id: string | null;
  zone_number_id: string | null;
  zone_type_id: string | null;
  survey: string | null;
  variety_mondha: number;
  variety_sanma: number;
  non_variety_mondha: number;
  non_variety_sanma: number;
  total_acre: number;
}

interface MozaInfo { id: string; moza_name: string; circle_id: string; }
interface CircleInfo { id: string; circle_name: string; zone_number_id: string | null; zone_type_id: string | null; }
interface ZoneNumberInfo { id: string; zone_number: string; }
interface ZoneTypeInfo { id: string; zone_type: string; }

interface MozaSummary {
  mozaName: string;
  circleName: string;
  zoneNumber: string;
  zoneType: string;
  passbookNumbers: string[];
  entries: EntryRow[];
  agg: VarietyAgg;
}

function num(v: number | null | undefined): number {
  return Number(v ?? 0);
}

export default function DashboardScreen() {
  const p = usePalette();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [grower, setGrower] = useState<GrowerRow | null>(null);
  const [summaries, setSummaries] = useState<MozaSummary[]>([]);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setError('');
    setGrower(null);
    setSummaries([]);
    setSearched(true);
    const term = q.trim();
    if (!term) { setError('Enter a Passbook #, Master Passbook # or C.N.I.C to search.'); return; }
    setLoading(true);
    try {
      let growerData: GrowerRow | null = null;
      let allGrowerIds: string[] = [];

      // Search by Passbook Number or Master Passbook Number
      const { data: byPassbook } = await supabase
        .from('growers')
        .select('id, passbook_number, master_passbook, grower_name, father_name, cnic, cell, bank_title, bank_account, transport_type')
        .or(`passbook_number.ilike.${term},master_passbook.ilike.${term}`);

      if (byPassbook && byPassbook.length > 0) {
        growerData = byPassbook[0] as GrowerRow;
        allGrowerIds = byPassbook.map((g) => g.id);
      }

      // Search by CNIC if not found
      if (!growerData) {
        const { data: byCnic } = await supabase
          .from('growers')
          .select('id, passbook_number, master_passbook, grower_name, father_name, cnic, cell, bank_title, bank_account, transport_type')
          .ilike('cnic', term)
          .order('created_at', { ascending: true });
        if (byCnic && byCnic.length > 0) {
          growerData = byCnic[0] as GrowerRow;
          allGrowerIds = byCnic.map((g) => g.id);
        }
      }

      if (!growerData) {
        setError('No grower found for this Passbook #, Master Passbook # or C.N.I.C.');
        setLoading(false);
        return;
      }
      setGrower(growerData);

      const { data: entries } = await supabase
        .from('passbook_entries')
        .select('id, grower_id, moza_id, circle_id, zone_number_id, zone_type_id, survey, variety_mondha, variety_sanma, non_variety_mondha, non_variety_sanma, total_acre')
        .in('grower_id', allGrowerIds);

      const { data: mozas } = await supabase.from('mozas').select('id, moza_name, circle_id');
      const { data: circles } = await supabase.from('circles').select('id, circle_name, zone_number_id, zone_type_id');
      const { data: zoneNumbers } = await supabase.from('zone_numbers').select('id, zone_number');
      const { data: zoneTypes } = await supabase.from('zone_types').select('id, zone_type');

      // Get passbook numbers per grower for each moza
      const { data: growersData } = await supabase
        .from('growers')
        .select('id, passbook_number')
        .in('id', allGrowerIds);
      const growerPbMap = new Map((growersData || []).map((g: any) => [g.id, g.passbook_number]));

      setSummaries(buildSummaries(
        entries || [],
        mozas || [],
        circles || [],
        zoneNumbers || [],
        zoneTypes || [],
        growerPbMap
      ));
    } catch (e: any) {
      setError(e?.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Grand total across all mozas
  const grandAgg = summaries.reduce((a, s) => {
    const c = a;
    s.agg.growers.forEach((g) => c.growers.add(g));
    c.varietyMondha += s.agg.varietyMondha;
    c.varietySanma += s.agg.varietySanma;
    c.nonVarietyMondha += s.agg.nonVarietyMondha;
    c.nonVarietySanma += s.agg.nonVarietySanma;
    return c;
  }, newAgg());

  return (
    <AppShell title="Dashboard">
      <View style={{ flex: 1 }}>
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle title="Grower Search" subtitle="Search by Passbook #, Master Passbook # or C.N.I.C — system auto-detects and finds all matching records." />
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Passbook #, Master Passbook # or C.N.I.C"
                keyboardType="default"
              />
            </View>
            <Button
              title="Search"
              onPress={() => runSearch(query)}
              loading={loading}
              icon={<Search size={16} color={p.primaryText} />}
            />
          </View>
          {error ? <Text style={{ color: p.error, fontSize: 13, marginTop: 8 }}>{error}</Text> : null}
        </Card>

        {loading ? (
          <Card><EmptyState message="Searching..." /></Card>
        ) : grower ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Grower header (shown once) */}
            <Card style={{ marginBottom: 16 }}>
              <View style={styles.growerHeader}>
                <View>
                  <Text style={[styles.growerName, { color: p.text }]}>{grower.grower_name}</Text>
                  {/* Updated to display Master Passbook Number */}
                  <Text style={[styles.growerSub, { color: p.textMuted }]}>
                    Master Passbook #: {grower.master_passbook || grower.passbook_number || '-'}
                  </Text>
                </View>
                <Badge label={`${summaries.length} Moza(s)`} tone="primary" />
              </View>
              <View style={styles.infoGrid}>
                <InfoCell label="Father Name" value={grower.father_name || '-'} />
                <InfoCell label="C.N.I.C" value={grower.cnic || '-'} />
                <InfoCell label="Cell #" value={grower.cell || '-'} />
                <InfoCell label="Bank Title" value={grower.bank_title || '-'} />
                <InfoCell label="Bank Acc#" value={grower.bank_account || '-'} />
                <InfoCell label="Transport Type" value={grower.transport_type || '-'} />
              </View>
            </Card>

            {/* All-Moza Summary Table */}
            {summaries.length > 0 ? (
              <Card style={{ marginBottom: 16 }}>
                <SectionTitle title="All Moza Summary" subtitle="Totals across all mozas for this grower (variety / non-variety mondha & sanma)" />
                <VarietyTable
                  labelHeader="Moza"
                  rows={summaries.map((s) => ({ label: s.mozaName, agg: s.agg }))}
                  totals={grandAgg}
                  palette={p}
                  totalLabel="Grand Total"
                />
              </Card>
            ) : null}

            {/* Moza-wise detail tables */}
            {summaries.map((s, i) => (
              <Card key={i} style={{ marginBottom: 16 }}>
                <View style={[styles.mozaHeader, { borderBottomColor: p.border }]}>
                  <View>
                    <Text style={[styles.mozaTitle, { color: p.text }]}>{s.mozaName}</Text>
                    <Text style={[styles.mozaSub, { color: p.textMuted }]}>
                      {s.zoneNumber} ({s.zoneType}) · {s.circleName}
                    </Text>
                  </View>
                  <View style={styles.pbBadgeWrap}>
                    {s.passbookNumbers.map((pb, j) => (
                      <Badge key={j} label={`PB: ${pb}`} tone="neutral" />
                    ))}
                  </View>
                </View>
                <SummaryTable s={s} palette={p} />
              </Card>
            ))}

            {summaries.length === 0 ? (
              <Card><EmptyState message="No passbook entries found for this grower." /></Card>
            ) : null}
          </ScrollView>
        ) : searched ? null : (
          <Card>
            <EmptyState message="Search for a grower by Passbook #, Master Passbook # or C.N.I.C to see their moza-wise summary." />
          </Card>
        )}
      </View>
    </AppShell>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={styles.infoCell}>
      <Text style={[styles.infoLabel, { color: p.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: p.text }]}>{value}</Text>
    </View>
  );
}

function SummaryTable({ s, palette: p }: { s: MozaSummary; palette: any }) {
  const tv = s.agg.varietyMondha + s.agg.varietySanma;
  const tnv = s.agg.nonVarietyMondha + s.agg.nonVarietySanma;
  const rows = [
    { type: 'Variety', mondha: s.agg.varietyMondha, sanma: s.agg.varietySanma, total: tv },
    { type: 'Non-Variety', mondha: s.agg.nonVarietyMondha, sanma: s.agg.nonVarietySanma, total: tnv },
    { type: 'Total', mondha: s.agg.varietyMondha + s.agg.nonVarietyMondha, sanma: s.agg.varietySanma + s.agg.nonVarietySanma, total: tv + tnv },
  ];
  return (
    <View style={{ marginTop: 8 }}>
      <View style={[styles.sumHeader, { borderBottomColor: p.border, backgroundColor: p.surfaceAlt }]}>
        <Text style={[styles.sumCellHead, { color: p.textMuted, flex: 1.4 }]}>Variety Type</Text>
        <Text style={[styles.sumCellHead, { color: p.textMuted, flex: 1 }]}>Mondha</Text>
        <Text style={[styles.sumCellHead, { color: p.textMuted, flex: 1 }]}>Sanma</Text>
        <Text style={[styles.sumCellHead, { color: p.textMuted, flex: 1 }]}>Total</Text>
      </View>
      {rows.map((r, idx) => {
        const isTotal = r.type === 'Total';
        return (
          <View key={idx} style={[styles.sumRow, { borderBottomColor: p.border, backgroundColor: isTotal ? p.primarySoft : p.surface }]}>
            <Text style={[styles.sumCell, { color: p.text, flex: 1.4, fontWeight: isTotal ? '700' : '500' }]}>{r.type}</Text>
            <Text style={[styles.sumCell, { color: p.text, flex: 1, fontWeight: isTotal ? '700' : '400' }]}>{r.mondha.toFixed(2)}</Text>
            <Text style={[styles.sumCell, { color: p.text, flex: 1, fontWeight: isTotal ? '700' : '400' }]}>{r.sanma.toFixed(2)}</Text>
            <Text style={[styles.sumCell, { color: p.text, flex: 1, fontWeight: isTotal ? '800' : '500' }]}>{r.total.toFixed(2)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function VarietyTable({ labelHeader, rows, totals, palette: p, totalLabel = 'Total' }: { labelHeader: string; rows: { label: string; agg: VarietyAgg }[]; totals: VarietyAgg; palette: any; totalLabel?: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      <View style={[styles.row, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.textMuted, fontWeight: '700' }]}>{labelHeader}</Text>
        {VARIETY_HEADERS.map((h) => (
          <Text key={h} style={[styles.cell, { flex: 1, color: p.textMuted, fontWeight: '700', textAlign: 'center', fontSize: 9 }]}>{h}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, { borderBottomColor: p.border, backgroundColor: i % 2 === 0 ? p.surface : p.surfaceAlt }]}>
          <Text style={[styles.cell, { flex: 1.4, color: p.text, fontWeight: '600' }]}>{r.label}</Text>
          {aggCells(r.agg).map((c, j) => <Text key={j} style={[styles.cell, { flex: 1, color: p.text, textAlign: 'center', fontSize: 11 }]}>{c}</Text>)}
        </View>
      ))}
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomWidth: 0 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800' }]}>{totalLabel}</Text>
        {aggCells(totals).map((c, j) => <Text key={j} style={[styles.cell, { flex: 1, color: p.primary, fontWeight: '800', textAlign: 'center', fontSize: 11 }]}>{c}</Text>)}
      </View>
    </View>
  );
}

function buildSummaries(
  entries: EntryRow[],
  mozas: MozaInfo[],
  circles: CircleInfo[],
  zoneNumbers: ZoneNumberInfo[],
  zoneTypes: ZoneTypeInfo[],
  growerPbMap: Map<string, string>
): MozaSummary[] {
  const mozaMap = new Map(mozas.map((m) => [m.id, m]));
  const circleMap = new Map(circles.map((c) => [c.id, c]));
  const znMap = new Map(zoneNumbers.map((z) => [z.id, z]));
  const ztMap = new Map(zoneTypes.map((z) => [z.id, z]));

  const groups = new Map<string, EntryRow[]>();
  entries.forEach((e) => {
    const key = e.moza_id || '__none__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  });

  const result: MozaSummary[] = [];
  groups.forEach((entryList, mozaId) => {
    const moza = mozaId === '__none__' ? null : mozaMap.get(mozaId) || null;
    const circle = moza?.circle_id ? circleMap.get(moza.circle_id) || null : null;
    const zn = circle?.zone_number_id ? znMap.get(circle.zone_number_id) || null : null;
    const zt = circle?.zone_type_id ? ztMap.get(circle.zone_type_id) || null : null;
    const agg = newAgg();
    const pbSet = new Set<string>();
    entryList.forEach((e) => {
      agg.growers.add(e.grower_id);
      agg.varietyMondha += num(e.variety_mondha);
      agg.varietySanma += num(e.variety_sanma);
      agg.nonVarietyMondha += num(e.non_variety_mondha);
      agg.nonVarietySanma += num(e.non_variety_sanma);
      const pb = growerPbMap.get(e.grower_id);
      if (pb) pbSet.add(pb);
    });
    result.push({
      mozaName: moza?.moza_name || 'Unknown Moza',
      circleName: circle?.circle_name || '-',
      zoneNumber: zn?.zone_number || '-',
      zoneType: zt?.zone_type || '-',
      passbookNumbers: Array.from(pbSet),
      entries: entryList,
      agg,
    });
  });
  return result.sort((a, b) => a.mozaName.localeCompare(b.mozaName));
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  growerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  growerName: { fontSize: 18, fontWeight: '800' },
  growerSub: { fontSize: 13, marginTop: 2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCell: { flex: 1, minWidth: 140 },
  infoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, marginTop: 2 },
  mozaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 4 },
  mozaTitle: { fontSize: 15, fontWeight: '700' },
  mozaSub: { fontSize: 12 },
  pbBadgeWrap: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  sumHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  sumCellHead: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sumRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 9, paddingHorizontal: 8 },
  sumCell: { fontSize: 13 },
  row: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  cell: { fontSize: 12 },
});
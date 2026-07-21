import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, SectionTitle, EmptyState, ErrorText } from '@/components/ui';
import { useReportData, ReportFilterBar, ReportFilters, emptyFilters, applyFilters, FlatRow, VARIETY_HEADERS, VarietyAgg, newAgg, addRow, aggCells, combineAgg } from '@/components/ReportCommon';

type Tab = 'circle' | 'moza';

export default function Report1Screen() {
  const p = usePalette();
  const { rows, zoneNumbers, zoneTypes, circles, mozas, loading, error } = useReportData();
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);
  const [tab, setTab] = useState<Tab>('circle');

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  const circleGroups = useMemo(() => {
    const map = new Map<string, { circleName: string; zoneName: string; agg: VarietyAgg }>();
    filtered.forEach((r) => {
      const key = r.circle_id || '__none__';
      if (!map.has(key)) map.set(key, { circleName: r.circle_name || 'Unknown', zoneName: r.zone_number ? `${r.zone_number} (${r.zone_type})` : '-', agg: newAgg() });
      addRow(map.get(key)!.agg, r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const mozaByCircle = useMemo(() => {
    const map = new Map<string, { circleName: string; zoneName: string; mozas: { mozaName: string; agg: VarietyAgg }[] }>();
    filtered.forEach((r) => {
      const ckey = r.circle_id || '__none__';
      if (!map.has(ckey)) map.set(ckey, { circleName: r.circle_name || 'Unknown', zoneName: r.zone_number ? `${r.zone_number} (${r.zone_type})` : '-', mozas: [] });
      const c = map.get(ckey)!;
      let mz = c.mozas.find((m) => m.mozaName === (r.moza_name || 'Unknown'));
      if (!mz) { mz = { mozaName: r.moza_name || 'Unknown', agg: newAgg() }; c.mozas.push(mz); }
      addRow(mz.agg, r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const grand = filtered.reduce((a, r) => { addRow(a, r); return a; }, newAgg());

  return (
    <AppShell title="Circle / Moza Wise Summary">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <ReportFilterBar filters={filters} setFilters={setFilters} onRun={() => setRan(true)} zoneNumbers={zoneNumbers} zoneTypes={zoneTypes} circles={circles} mozas={mozas} />
        {error ? <ErrorText message={error} /> : null}

        {loading ? (
          <Card><EmptyState message="Loading report..." /></Card>
        ) : ran || Object.values(filters).some(Boolean) ? (
          <>
            {/* Tabs */}
            <View style={[styles.tabBar, { borderBottomColor: p.border }]}>
              <TouchableOpacity onPress={() => setTab('circle')} style={[styles.tab, tab === 'circle' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === 'circle' ? p.primary : p.textMuted }}>Circle Wise Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTab('moza')} style={[styles.tab, tab === 'moza' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === 'moza' ? p.primary : p.textMuted }}>Moza Wise Summary</Text>
              </TouchableOpacity>
            </View>

            {tab === 'circle' ? (
              <Card>
                <SectionTitle title="Circle Wise Summary" subtitle="Total Growers, Mondha, Sanma, Acre per circle" />
                {circleGroups.length === 0 ? <EmptyState message="No data." /> : (
                  <VarietyTable labelHeader="Circle" rows={circleGroups.map((c) => ({ label: c.circleName, agg: c.agg }))} totals={circleGroups.reduce((a, c) => combineAgg(a, c.agg), newAgg())} palette={p} />
                )}
              </Card>
            ) : (
              <Card>
                <SectionTitle title="Moza Wise Summary" subtitle="Grouped by circle with circle subtotals and grand total" />
                {mozaByCircle.length === 0 ? <EmptyState message="No data." /> : (
                  mozaByCircle.map((c, i) => {
                    const cTot = c.mozas.reduce((a, m) => combineAgg(a, m.agg), newAgg());
                    return (
                      <View key={i} style={{ marginBottom: 16 }}>
                        <View style={[styles.groupHeader, { borderBottomColor: p.border }]}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: p.primary }}>{c.circleName}</Text>
                          <Text style={{ fontSize: 11, color: p.textMuted }}>{c.zoneName}</Text>
                        </View>
                        <VarietyTable labelHeader="Moza" rows={c.mozas.map((m) => ({ label: m.mozaName, agg: m.agg }))} totals={cTot} palette={p} totalLabel="Circle Total" />
                      </View>
                    );
                  })
                )}
                <View style={{ marginTop: 8 }}>
                  <VarietyTable labelHeader="" rows={[]} totals={grand} palette={p} totalLabel="Grand Total" totalsOnly />
                </View>
              </Card>
            )}
          </>
        ) : (
          <Card><EmptyState message="Set filters and tap Run Report to generate." /></Card>
        )}
      </ScrollView>
    </AppShell>
  );
}

function VarietyTable({ labelHeader, rows, totals, palette: p, totalLabel = 'Total', totalsOnly }: { labelHeader: string; rows: { label: string; agg: VarietyAgg }[]; totals: VarietyAgg; palette: any; totalLabel?: string; totalsOnly?: boolean }) {
  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      <View style={[styles.row, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.textMuted, fontWeight: '700' }]}>{labelHeader}</Text>
        {VARIETY_HEADERS.map((h, i) => (
          <Text key={h} style={[styles.cell, { flex: 1, color: p.textMuted, fontWeight: '700', textAlign: 'center', fontSize: 9 }]}>{h}</Text>
        ))}
      </View>
      {!totalsOnly ? rows.map((r, i) => (
        <View key={i} style={[styles.row, { borderBottomColor: p.border, backgroundColor: i % 2 === 0 ? p.surface : p.surfaceAlt }]}>
          <Text style={[styles.cell, { flex: 1.4, color: p.text, fontWeight: '600' }]}>{r.label}</Text>
          {aggCells(r.agg).map((c, j) => <Text key={j} style={[styles.cell, { flex: 1, color: p.text, textAlign: 'center', fontSize: 11 }]}>{c}</Text>)}
        </View>
      )) : null}
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomWidth: 0 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800' }]}>{totalLabel}</Text>
        {aggCells(totals).map((c, j) => <Text key={j} style={[styles.cell, { flex: 1, color: p.primary, fontWeight: '800', textAlign: 'center', fontSize: 11 }]}>{c}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16, gap: 8 },
  tab: { paddingVertical: 10, paddingHorizontal: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  cell: { fontSize: 12 },
});

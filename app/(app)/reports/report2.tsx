import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, SectionTitle, EmptyState, ErrorText } from '@/components/ui';
import { useReportData, ReportFilterBar, ReportFilters, emptyFilters, applyFilters, FlatRow } from '@/components/ReportCommon';

function num(v: any): number { return Number(v ?? 0); }

const CATEGORIES = [
  { label: '0.1 - 5', min: 0.1, max: 5 },
  { label: '5.1 - 10', min: 5.1, max: 10 },
  { label: '10.1 - 15', min: 10.1, max: 15 },
  { label: '15.1 - 25', min: 15.1, max: 25 },
  { label: '25.1 - 50', min: 25.1, max: 50 },
  { label: '50.1+', min: 50.1, max: Infinity },
];

type Tab = 'circle' | 'moza';

function categorize(rows: FlatRow[]) {
  return CATEGORIES.map((cat) => {
    const inRange = rows.filter((r) => r.total_acre >= cat.min && r.total_acre <= cat.max);
    const growers = new Set(inRange.map((r) => r.grower_name + '|' + r.cnic)).size;
    const acres = inRange.reduce((a, r) => a + r.total_acre, 0);
    return { label: cat.label, growers, acres };
  });
}

export default function Report2Screen() {
  const p = usePalette();
  const { rows, zoneNumbers, zoneTypes, circles, mozas, loading, error } = useReportData();
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);
  const [tab, setTab] = useState<Tab>('circle');

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  const circleGroups = useMemo(() => {
    const map = new Map<string, { circleName: string; zoneName: string; rows: FlatRow[] }>();
    filtered.forEach((r) => {
      const key = r.circle_id || '__none__';
      if (!map.has(key)) map.set(key, { circleName: r.circle_name || 'Unknown', zoneName: r.zone_number ? `${r.zone_number} (${r.zone_type})` : '-', rows: [] });
      map.get(key)!.rows.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const mozaByCircle = useMemo(() => {
    const map = new Map<string, { circleName: string; zoneName: string; mozas: { mozaName: string; rows: FlatRow[] }[] }>();
    filtered.forEach((r) => {
      const ckey = r.circle_id || '__none__';
      if (!map.has(ckey)) map.set(ckey, { circleName: r.circle_name || 'Unknown', zoneName: r.zone_number ? `${r.zone_number} (${r.zone_type})` : '-', mozas: [] });
      const c = map.get(ckey)!;
      let mz = c.mozas.find((m) => m.mozaName === (r.moza_name || 'Unknown'));
      if (!mz) { mz = { mozaName: r.moza_name || 'Unknown', rows: [] }; c.mozas.push(mz); }
      mz.rows.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const grandCat = useMemo(() => categorize(filtered), [filtered]);

  return (
    <AppShell title="Category Wise Summary">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <ReportFilterBar filters={filters} setFilters={setFilters} onRun={() => setRan(true)} zoneNumbers={zoneNumbers} zoneTypes={zoneTypes} circles={circles} mozas={mozas} showAcreRange />
        {error ? <ErrorText message={error} /> : null}

        {loading ? (
          <Card><EmptyState message="Loading report..." /></Card>
        ) : ran || Object.values(filters).some(Boolean) ? (
          <>
            <View style={[styles.tabBar, { borderBottomColor: p.border }]}>
              <TouchableOpacity onPress={() => setTab('circle')} style={[styles.tab, tab === 'circle' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === 'circle' ? p.primary : p.textMuted }}>Circle Wise Category</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTab('moza')} style={[styles.tab, tab === 'moza' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === 'moza' ? p.primary : p.textMuted }}>Moza Wise Category</Text>
              </TouchableOpacity>
            </View>

            {tab === 'circle' ? (
              <Card>
                <SectionTitle title="Circle Wise Category Wise Report" subtitle="Growers and acres by acre-range category per circle" />
                {circleGroups.length === 0 ? <EmptyState message="No data." /> : (
                  <CategoryTable groups={circleGroups.map((c) => ({ label: c.circleName, rows: c.rows }))} palette={p} />
                )}
              </Card>
            ) : (
              <Card>
                <SectionTitle title="Moza Wise Category Wise Report" subtitle="Grouped by circle with circle subtotals and grand total" />
                {mozaByCircle.length === 0 ? <EmptyState message="No data." /> : (
                  mozaByCircle.map((c, i) => (
                    <View key={i} style={{ marginBottom: 16 }}>
                      <View style={[styles.groupHeader, { borderBottomColor: p.border }]}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: p.primary }}>{c.circleName}</Text>
                        <Text style={{ fontSize: 11, color: p.textMuted }}>{c.zoneName}</Text>
                      </View>
                      <CategoryTable groups={c.mozas.map((m) => ({ label: m.mozaName, rows: m.rows }))} palette={p} />
                    </View>
                  ))
                )}
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.subTitle, { color: p.textMuted }]}>Grand Total (all circles)</Text>
                  <GrandCategoryRow cats={grandCat} palette={p} />
                </View>
              </Card>
            )}
          </>
        ) : (
          <Card><EmptyState message="Set filters and tap Run Report. Use From/To Acre to narrow the range, or leave blank for all categories." /></Card>
        )}
      </ScrollView>
    </AppShell>
  );
}

function CategoryTable({ groups, palette: p }: { groups: { label: string; rows: FlatRow[] }[]; palette: any }) {
  const allCats = CATEGORIES.map((c) => c.label);
  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      <View style={[styles.row, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.textMuted, fontWeight: '700' }]}>Circle / Moza</Text>
        {allCats.map((c) => (
          <Text key={c} style={[styles.cell, { flex: 1, color: p.textMuted, fontWeight: '700', textAlign: 'center', fontSize: 9 }]}>{c}</Text>
        ))}
      </View>
      {groups.map((g, i) => {
        const cats = categorize(g.rows);
        return (
          <View key={i} style={[styles.row, { borderBottomColor: p.border, backgroundColor: i % 2 === 0 ? p.surface : p.surfaceAlt }]}>
            <Text style={[styles.cell, { flex: 1.4, color: p.text, fontWeight: '600' }]}>{g.label}</Text>
            {cats.map((c) => (
              <View key={c.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: p.text, fontWeight: '600' }}>{c.growers}</Text>
                <Text style={{ fontSize: 10, color: p.textMuted }}>{c.acres.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomWidth: 0 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800' }]}>Total</Text>
        {(() => {
          const cats = categorize(groups.flatMap((g) => g.rows));
          return cats.map((c) => (
            <View key={c.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: p.primary, fontWeight: '800' }}>{c.growers}</Text>
              <Text style={{ fontSize: 10, color: p.primary }}>{c.acres.toFixed(1)}</Text>
            </View>
          ));
        })()}
      </View>
    </View>
  );
}

function GrandCategoryRow({ cats, palette: p }: { cats: { label: string; growers: number; acres: number }[]; palette: any }) {
  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomWidth: 0 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800' }]}>Grand Total</Text>
        {cats.map((c) => (
          <View key={c.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: p.primary, fontWeight: '800' }}>{c.growers}</Text>
            <Text style={{ fontSize: 10, color: p.primary }}>{c.acres.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16, gap: 8 },
  tab: { paddingVertical: 10, paddingHorizontal: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 8 },
  subTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  cell: { fontSize: 12 },
});

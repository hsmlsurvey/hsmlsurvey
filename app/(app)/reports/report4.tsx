import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, EmptyState, ErrorText } from '@/components/ui';
import { DataTable, Column } from '@/components/DataTable';
import { useReportData, ReportFilterBar, ReportFilters, emptyFilters, applyFilters, FlatRow } from '@/components/ReportCommon';

function num(v: any): number { return Number(v ?? 0); }

export default function Report4Screen() {
  const p = usePalette();
  const { rows, zoneNumbers, zoneTypes, circles, mozas, loading, error } = useReportData();
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  const mozaGroups = useMemo(() => {
    const map = new Map<string, { mozaName: string; circleName: string; zoneName: string; rows: FlatRow[] }>();
    filtered.forEach((r) => {
      const key = r.moza_id || '__none__';
      if (!map.has(key)) map.set(key, { mozaName: r.moza_name || 'Unknown', circleName: r.circle_name || '-', zoneName: r.zone_number ? `${r.zone_number} (${r.zone_type})` : '-', rows: [] });
      map.get(key)!.rows.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const grandTotals = filtered.reduce((a, r) => ({
    vm: a.vm + r.variety_mondha, vs: a.vs + r.variety_sanma,
    nvm: a.nvm + r.non_variety_mondha, nvs: a.nvs + r.non_variety_sanma,
    tm: a.tm + r.total_mondha, ts: a.ts + r.total_sanma,
    acre: a.acre + r.total_acre, grand: a.grand + r.grand_total,
  }), { vm: 0, vs: 0, nvm: 0, nvs: 0, tm: 0, ts: 0, acre: 0, grand: 0 });

  // Footer row for moza totals — aligned with columns
  const buildFooterRow = (t: typeof grandTotals) => ({
    passbook_number: '', grower_name: '', father_name: '', cnic: '', cell: '',
    bank_title: '', bank_account: '', transport_type: '',
    variety_mondha: t.vm, variety_sanma: t.vs,
    non_variety_mondha: t.nvm, non_variety_sanma: t.nvs,
    total_mondha: t.tm, total_sanma: t.ts, total_acre: t.acre, grand_total: t.grand,
  });

  return (
    <AppShell title="Grower Wise Details">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <ReportFilterBar filters={filters} setFilters={setFilters} onRun={() => setRan(true)} zoneNumbers={zoneNumbers} zoneTypes={zoneTypes} circles={circles} mozas={mozas} />
        {error ? <ErrorText message={error} /> : null}

        {loading ? (
          <Card><EmptyState message="Loading report..." /></Card>
        ) : ran || Object.values(filters).some(Boolean) ? (
          <>
            {mozaGroups.length === 0 ? (
              <Card><EmptyState message="No data for selected filters." /></Card>
            ) : (
              mozaGroups.map((g, i) => {
                const tot = g.rows.reduce((a, r) => ({
                  vm: a.vm + r.variety_mondha, vs: a.vs + r.variety_sanma,
                  nvm: a.nvm + r.non_variety_mondha, nvs: a.nvs + r.non_variety_sanma,
                  tm: a.tm + r.total_mondha, ts: a.ts + r.total_sanma,
                  acre: a.acre + r.total_acre, grand: a.grand + r.grand_total,
                }), { vm: 0, vs: 0, nvm: 0, nvs: 0, tm: 0, ts: 0, acre: 0, grand: 0 });
                const cols: Column<FlatRow>[] = [
                  { key: 'passbook_number', label: 'Passbook#', width: 110, render: (r) => <Text style={{ fontWeight: '700', color: p.text }}>{r.passbook_number}</Text> },
                  { key: 'grower_name', label: 'Grower', width: 140, render: (r) => <Text style={{ color: p.text }}>{r.grower_name}</Text> },
                  { key: 'father_name', label: 'Father', width: 120 },
                  { key: 'cnic', label: 'C.N.I.C', width: 130 },
                  { key: 'cell', label: 'Cell#', width: 110 },
                  { key: 'bank_title', label: 'Bank', width: 120 },
                  { key: 'bank_account', label: 'Acc#', width: 110 },
                  { key: 'transport_type', label: 'Transport', width: 100 },
                  { key: 'variety_mondha', label: 'V.M', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text }}>{r.variety_mondha.toFixed(2)}</Text> },
                  { key: 'variety_sanma', label: 'V.S', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text }}>{r.variety_sanma.toFixed(2)}</Text> },
                  { key: '_tv', label: 'T.V', width: 80, align: 'right', sortable: false, render: (r) => <Text style={{ color: p.text }}>{(r.variety_mondha + r.variety_sanma).toFixed(2)}</Text> },
                  { key: 'non_variety_mondha', label: 'NV.M', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text }}>{r.non_variety_mondha.toFixed(2)}</Text> },
                  { key: 'non_variety_sanma', label: 'NV.S', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text }}>{r.non_variety_sanma.toFixed(2)}</Text> },
                  { key: '_tnv', label: 'T.NV', width: 80, align: 'right', sortable: false, render: (r) => <Text style={{ color: p.text }}>{(r.non_variety_mondha + r.non_variety_sanma).toFixed(2)}</Text> },
                  { key: 'total_mondha', label: 'T.M', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text, fontWeight: '600' }}>{r.total_mondha.toFixed(2)}</Text> },
                  { key: 'total_sanma', label: 'T.S', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text, fontWeight: '600' }}>{r.total_sanma.toFixed(2)}</Text> },
                  { key: 'total_acre', label: 'Acre', width: 80, align: 'right', render: (r) => <Text style={{ color: p.text }}>{r.total_acre.toFixed(2)}</Text> },
                  { key: 'grand_total', label: 'G Total', width: 90, align: 'right', render: (r) => <Text style={{ color: p.primary, fontWeight: '800' }}>{r.grand_total.toFixed(2)}</Text> },
                ];
                const footerRow = buildFooterRow(tot) as any;
                return (
                  <Card key={i} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                    <View style={[styles.mozaHeader, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: p.primary }}>{g.mozaName}</Text>
                        <Text style={{ fontSize: 11, color: p.textMuted }}>{g.zoneName} · {g.circleName} · {g.rows.length} grower(s)</Text>
                      </View>
                    </View>
                    <DataTable
                      columns={cols}
                      rows={g.rows}
                      smallHeaders
                      pageSize={50}
                      footerRow={
                        <View style={[styles.footerRow, { backgroundColor: p.primarySoft, borderTopColor: p.border }]}>
                          {cols.map((c, idx) => {
                            const v = (footerRow as any)[c.key];
                            const isCalc = c.key === '_tv' || c.key === '_tnv';
                            const display = isCalc
                              ? (c.key === '_tv' ? (tot.vm + tot.vs).toFixed(2) : (tot.nvm + tot.nvs).toFixed(2))
                              : typeof v === 'number' ? v.toFixed(2) : (v || '');
                            return (
                              <View key={idx} style={[styles.footerCell, { width: c.width || 80, alignItems: c.align === 'right' ? 'flex-end' : 'flex-start' }]}>
                                <Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>
                                  {typeof v === 'number' || isCalc ? display : ''}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      }
                    />
                  </Card>
                );
              })
            )}

            {/* Grand total footer — Horizontally Scrollable & Aligned with Columns */}
            <Card style={{ padding: 0, overflow: 'hidden', backgroundColor: p.primarySoft, borderColor: p.primary }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={[styles.grandRow, { backgroundColor: p.primarySoft }]}>
                  {['Passbook#','Grower','Father','C.N.I.C','Cell#','Bank','Acc#','Transport','V.M','V.S','T.V','NV.M','NV.S','T.NV','T.M','T.S','Acre','G Total'].map((h, i) => {
                    const widths = [110, 140, 120, 130, 110, 120, 110, 100, 80, 80, 80, 80, 80, 80, 80, 80, 80, 90];
                    const align = i >= 8 ? 'right' : 'left';
                    const vals = [
                      grandTotals.vm,
                      grandTotals.vs,
                      grandTotals.vm + grandTotals.vs,
                      grandTotals.nvm,
                      grandTotals.nvs,
                      grandTotals.nvm + grandTotals.nvs,
                      grandTotals.tm,
                      grandTotals.ts,
                      grandTotals.acre,
                      grandTotals.grand,
                    ];
                    const valIdx = i - 8;

                    return (
                      <View key={i} style={[styles.grandCell, { width: widths[i], alignItems: align === 'right' ? 'flex-end' : 'flex-start' }]}>
                        {i === 0 ? (
                          <Text style={{ color: p.primary, fontWeight: '900', fontSize: 12 }}>GRAND TOTAL</Text>
                        ) : i < 8 ? (
                          <Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }} />
                        ) : (
                          <Text style={{ color: p.primary, fontWeight: '800', fontSize: 12 }}>
                            {vals[valIdx].toFixed(2)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </Card>
          </>
        ) : (
          <Card><EmptyState message="Set filters and tap Run Report to generate." /></Card>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  mozaHeader: { padding: 12, borderBottomWidth: 1 },
  footerRow: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 4 },
  footerCell: { paddingHorizontal: 8, paddingVertical: 2 },
  grandRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4 },
  grandCell: { paddingHorizontal: 8, paddingVertical: 2 },
});
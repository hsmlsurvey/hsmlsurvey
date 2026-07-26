import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, SectionTitle, EmptyState, ErrorText } from '@/components/ui';
import {
  useReportData,
  ReportFilters,
  emptyFilters,
  VARIETY_HEADERS,
  VarietyAgg,
  newAgg,
  addRow,
  aggCells,
  combineAgg,
  cleanZone,
} from '@/components/ReportCommon';

type Tab = 'circle' | 'moza';

interface OptionItem {
  label: string;
  value: string;
}

// Helper function to parse numeric values safely
const parseNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(parsed) ? 0 : parsed;
};

// Searchable Dropdown Component
function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  palette: p,
}: {
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  palette: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <View style={[styles.filterItem, { position: 'relative', zIndex: isOpen ? 1000 : 1 }]}>
      <Text style={[styles.filterLabel, { color: p.textMuted }]}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsOpen(!isOpen)}
        style={[
          styles.selectTrigger,
          { backgroundColor: p.surface, borderColor: p.border },
        ]}
      >
        <Text style={{ color: selectedOption ? p.text : p.textMuted, fontSize: 13, flex: 1 }} numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={{ color: p.textMuted, fontSize: 10, marginLeft: 6 }}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          <View style={[styles.dropdownMenu, { backgroundColor: p.surface, borderColor: p.border }]}>
            <View style={{ padding: 6, borderBottomWidth: 1, borderBottomColor: p.border }}>
              <TextInput
                placeholder={searchPlaceholder}
                placeholderTextColor={p.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
                style={[
                  styles.dropdownSearchInput,
                  { backgroundColor: p.surfaceAlt, color: p.text, borderColor: p.border },
                ]}
              />
            </View>

            <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearch('');
                }}
                style={[
                  styles.optionRow,
                  { borderBottomColor: p.border },
                  !value && { backgroundColor: p.primarySoft },
                ]}
              >
                <Text style={{ color: !value ? p.primary : p.textMuted, fontSize: 13, fontWeight: !value ? '700' : '400' }}>
                  {placeholder}
                </Text>
              </TouchableOpacity>

              {filteredOptions.length === 0 ? (
                <View style={{ padding: 12 }}>
                  <Text style={{ color: p.textMuted, fontSize: 12, textAlign: 'center' }}>No record found</Text>
                </View>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      style={[
                        styles.optionRow,
                        { borderBottomColor: p.border },
                        isSelected && { backgroundColor: p.primarySoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? p.primary : p.text,
                          fontSize: 13,
                          fontWeight: isSelected ? '700' : '400',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

export default function Report3Screen() {
  const p = usePalette();
  const reportData = useReportData() as any;
  const { rows, zoneNumbers = [], zoneTypes = [], circles = [], mozas = [], loading, error } = reportData;
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);
  const [tab, setTab] = useState<Tab>('circle');

  // Mappings & Lists
  const zoneNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    zoneNumbers.forEach((z: any) => {
      const numStr = cleanZone(z.zone_number ?? z.number ?? z.id);
      if (z.id) map.set(String(z.id), numStr);
      if (numStr) map.set(numStr, numStr);
    });
    return map;
  }, [zoneNumbers]);

  const zoneTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    zoneTypes.forEach((t: any) => {
      const typeStr = String(t.zone_type ?? t.name ?? t.id ?? '').trim();
      if (t.id) map.set(String(t.id), typeStr);
      if (typeStr) map.set(typeStr.toLowerCase(), typeStr);
    });
    return map;
  }, [zoneTypes]);

  const circleZoneMap = useMemo(() => {
    const map = new Map<string, { zoneNumber: string; zoneType: string }>();
    circles.forEach((c: any) => {
      const zNum = cleanZone(c.zone_number) || zoneNumberMap.get(String(c.zone_number_id || c.zone_id || '')) || '';
      const zType = String(c.zone_type || zoneTypeMap.get(String(c.zone_type_id || '')) || '').trim();

      const info = { zoneNumber: zNum, zoneType: zType };
      if (c.id) map.set(String(c.id), info);
      if (c.circle_code) map.set(String(c.circle_code), info);
    });
    return map;
  }, [circles, zoneNumberMap, zoneTypeMap]);

  const cleanZoneNumbersList = useMemo(() => {
    const set = new Set<string>();
    const list: { val: string; display: string }[] = [];
    zoneNumbers.forEach((z: any) => {
      const raw = typeof z === 'object' ? (z.zone_number ?? z.number ?? z.id) : z;
      const c = cleanZone(raw);
      if (c && !set.has(c)) {
        set.add(c);
        list.push({ val: c, display: `Zone ${c}` });
      }
    });
    return list.sort((a, b) => a.val.localeCompare(b.val, undefined, { numeric: true }));
  }, [zoneNumbers]);

  const cleanZoneTypesList = useMemo(() => {
    const set = new Set<string>();
    const list: string[] = [];
    zoneTypes.forEach((t: any) => {
      const val = typeof t === 'object' ? (t.zone_type ?? t.name ?? t.id) : t;
      const s = String(val || '').trim();
      if (s && !set.has(s.toLowerCase())) {
        set.add(s.toLowerCase());
        list.push(s);
      }
    });
    return list;
  }, [zoneTypes]);

  const filteredCircles = useMemo(() => {
    return circles.filter((c: any) => {
      const cZoneNum = cleanZone(c.zone_number) || zoneNumberMap.get(String(c.zone_number_id || c.zone_id || '')) || '';
      const cZoneType = String(c.zone_type || zoneTypeMap.get(String(c.zone_type_id || '')) || '').trim();

      if (filters.zoneNumber && cZoneNum && cZoneNum !== cleanZone(filters.zoneNumber)) {
        return false;
      }
      if (filters.zoneType && cZoneType && cZoneType.toLowerCase() !== filters.zoneType.toLowerCase()) {
        return false;
      }
      return true;
    }).sort((a: any, b: any) =>
      String(a.circle_code || '').localeCompare(String(b.circle_code || ''), undefined, { numeric: true })
    );
  }, [circles, filters.zoneNumber, filters.zoneType, zoneNumberMap, zoneTypeMap]);

  const filteredMozas = useMemo(() => {
    return mozas.filter((m: any) => {
      const parentCircleInfo = circleZoneMap.get(String(m.circle_id || m.circle_code || ''));

      const mZoneNum = cleanZone(m.zone_number) ||
                       zoneNumberMap.get(String(m.zone_number_id || m.zone_id || '')) ||
                       parentCircleInfo?.zoneNumber || '';

      const mZoneType = String(m.zone_type || zoneTypeMap.get(String(m.zone_type_id || '')) || parentCircleInfo?.zoneType || '').trim();

      if (filters.zoneNumber && mZoneNum && mZoneNum !== cleanZone(filters.zoneNumber)) {
        return false;
      }
      if (filters.zoneType && mZoneType && mZoneType.toLowerCase() !== filters.zoneType.toLowerCase()) {
        return false;
      }
      if ((filters as any).circle) {
        const targetCircle = String((filters as any).circle);
        if (String(m.circle_id || m.circle_code || '') !== targetCircle) {
          return false;
        }
      }
      return true;
    }).sort((a: any, b: any) =>
      String(a.moza_code || '').localeCompare(String(b.moza_code || ''), undefined, { numeric: true })
    );
  }, [mozas, filters.zoneNumber, filters.zoneType, (filters as any).circle, zoneNumberMap, zoneTypeMap, circleZoneMap]);

  const circleOptions = useMemo(() => {
    return filteredCircles.map((c: any, idx: number) => ({
      label: `[${c.circle_code || '-'}] ${c.circle_name || 'Unknown'}`,
      value: String(c.id ?? c.circle_code ?? idx),
    }));
  }, [filteredCircles]);

  const mozaOptions = useMemo(() => {
    return filteredMozas.map((m: any, idx: number) => ({
      label: `[${m.moza_code || '-'}] ${m.moza_name || 'Unknown'}`,
      value: String(m.id ?? m.moza_code ?? idx),
    }));
  }, [filteredMozas]);

  const filtered = useMemo(() => {
    return (rows || []).filter((r: any) => {
      const rZoneNum = cleanZone(r.zone_number) || zoneNumberMap.get(String(r.zone_number_id || '')) || '';
      const rZoneType = String(r.zone_type || zoneTypeMap.get(String(r.zone_type_id || '')) || '').trim();

      if (filters.zoneNumber && rZoneNum !== cleanZone(filters.zoneNumber)) {
        return false;
      }
      if (filters.zoneType && rZoneType.toLowerCase() !== filters.zoneType.toLowerCase()) {
        return false;
      }
      if ((filters as any).circle) {
        const selC = String((filters as any).circle);
        if (String(r.circle_id || '') !== selC && String(r.circle_code || '') !== selC) {
          return false;
        }
      }
      if ((filters as any).moza) {
        const selM = String((filters as any).moza);
        if (String(r.moza_id || '') !== selM && String(r.moza_code || '') !== selM) {
          return false;
        }
      }
      return true;
    });
  }, [rows, filters, zoneNumberMap, zoneTypeMap]);

  const circleGroups = useMemo(() => {
    const map = new Map<
      string,
      { circleName: string; circleCode: string; zoneName: string; agg: VarietyAgg }
    >();
    filtered.forEach((r: any) => {
      const key = String(r.circle_id || r.circle_code || '__none__');
      if (!map.has(key)) {
        map.set(key, {
          circleName: r.circle_name || 'Unknown',
          circleCode: String(r.circle_code || ''),
          zoneName: r.zone_number ? `Zone ${cleanZone(r.zone_number)} (${r.zone_type || ''})` : '-',
          agg: newAgg(),
        });
      }
      addRow(map.get(key)!.agg, r);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.circleCode && b.circleCode) {
        return a.circleCode.localeCompare(b.circleCode, undefined, { numeric: true });
      }
      return a.circleName.localeCompare(b.circleName, undefined, { numeric: true });
    });
  }, [filtered]);

  const mozaByCircle = useMemo(() => {
    const map = new Map<
      string,
      {
        circleName: string;
        circleCode: string;
        zoneName: string;
        mozaMap: Map<string, { mozaName: string; mozaCode: string; agg: VarietyAgg }>;
      }
    >();

    filtered.forEach((r: any) => {
      const ckey = String(r.circle_id || r.circle_code || '__none__');
      if (!map.has(ckey)) {
        map.set(ckey, {
          circleName: r.circle_name || 'Unknown',
          circleCode: String(r.circle_code || ''),
          zoneName: r.zone_number ? `Zone ${cleanZone(r.zone_number)} (${r.zone_type || ''})` : '-',
          mozaMap: new Map(),
        });
      }
      const c = map.get(ckey)!;
      const mkey = String(r.moza_id || r.moza_code || '__none__');
      if (!c.mozaMap.has(mkey)) {
        c.mozaMap.set(mkey, {
          mozaName: r.moza_name || 'Unknown',
          mozaCode: String(r.moza_code || ''),
          agg: newAgg(),
        });
      }
      addRow(c.mozaMap.get(mkey)!.agg, r);
    });

    return Array.from(map.values())
      .map((c) => ({
        circleName: c.circleName,
        circleCode: c.circleCode,
        zoneName: c.zoneName,
        mozas: Array.from(c.mozaMap.values()).sort((a, b) => {
          if (a.mozaCode && b.mozaCode) {
            return a.mozaCode.localeCompare(b.mozaCode, undefined, { numeric: true });
          }
          return a.mozaName.localeCompare(b.mozaName, undefined, { numeric: true });
        }),
      }))
      .sort((a, b) => {
        if (a.circleCode && b.circleCode) {
          return a.circleCode.localeCompare(b.circleCode, undefined, { numeric: true });
        }
        return a.circleName.localeCompare(b.circleName, undefined, { numeric: true });
      });
  }, [filtered]);

  const grand = filtered.reduce((a: VarietyAgg, r: any) => {
    addRow(a, r);
    return a;
  }, newAgg());

  const totalCirclesCount = circleGroups.length;
  const totalMozasCount = useMemo(() => {
    return mozaByCircle.reduce((sum, c) => sum + c.mozas.length, 0);
  }, [mozaByCircle]);

  return (
    <AppShell title="Variety Wise Summary">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <Card style={{ marginBottom: 16, zIndex: 100, overflow: 'visible' }}>
          <SectionTitle title="Filters" subtitle="Cascading Filters with Code-Wise Sorting" />

          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: p.textMuted }]}>Zone #</Text>
              <select
                value={cleanZone(filters.zoneNumber) || ''}
                onChange={(e) =>
                  setFilters((prev: any) => ({ ...prev, zoneNumber: e.target.value, circle: '', moza: '' }))
                }
                style={{ ...styles.selectBox, backgroundColor: p.surface, color: p.text, borderColor: p.border }}
              >
                <option value="">All Zones</option>
                {cleanZoneNumbersList.map((z) => (
                  <option key={z.val} value={z.val}>
                    {z.display}
                  </option>
                ))}
              </select>
            </View>

            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: p.textMuted }]}>Zone Type</Text>
              <select
                value={filters.zoneType || ''}
                onChange={(e) =>
                  setFilters((prev: any) => ({ ...prev, zoneType: e.target.value, circle: '', moza: '' }))
                }
                style={{ ...styles.selectBox, backgroundColor: p.surface, color: p.text, borderColor: p.border }}
              >
                <option value="">All Types</option>
                {cleanZoneTypesList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </View>

            <SearchableSelect
              label="Circle [Code - Name]"
              placeholder={`All Circles (${circleOptions.length})`}
              searchPlaceholder="Search Circle..."
              options={circleOptions}
              value={(filters as any).circle || ''}
              onChange={(val) => setFilters((prev: any) => ({ ...prev, circle: val, moza: '' }))}
              palette={p}
            />

            <SearchableSelect
              label="Moza [Code - Name]"
              placeholder={`All Mozas (${mozaOptions.length})`}
              searchPlaceholder="Search Moza..."
              options={mozaOptions}
              value={(filters as any).moza || ''}
              onChange={(val) => setFilters((prev: any) => ({ ...prev, moza: val }))}
              palette={p}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={() => {
                setFilters(emptyFilters);
                setRan(true);
              }}
              style={[styles.btn, { backgroundColor: p.surfaceAlt, borderColor: p.border, borderWidth: 1 }]}
            >
              <Text style={{ color: p.text, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRan(true)}
              style={[styles.btn, { backgroundColor: p.primary }]}
            >
              <Text style={{ color: p.primaryText, fontWeight: '700' }}>Run Report</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {error ? <ErrorText message={error} /> : null}

        {loading ? (
          <Card>
            <EmptyState message="Loading report data (fetching all records)..." />
          </Card>
        ) : ran || Object.values(filters).some(Boolean) ? (
          <>
            <View style={[styles.tabBar, { borderBottomColor: p.border }]}>
              <TouchableOpacity
                onPress={() => setTab('circle')}
                style={[
                  styles.tab,
                  tab === 'circle' && { borderBottomColor: p.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: tab === 'circle' ? p.primary : p.textMuted,
                  }}
                >
                  Circle Wise Variety ({totalCirclesCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTab('moza')}
                style={[
                  styles.tab,
                  tab === 'moza' && { borderBottomColor: p.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: tab === 'moza' ? p.primary : p.textMuted,
                  }}
                >
                  Moza Wise Variety ({totalMozasCount})
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'circle' ? (
              <Card>
                <SectionTitle
                  title="Circle Wise Variety Summary"
                  subtitle={`Variety / Non-Variety Mondha & Sanma across ${totalCirclesCount} Circles`}
                />
                {circleGroups.length === 0 ? (
                  <EmptyState message="No data found." />
                ) : (
                  <VarietyTable
                    labelHeader="Circle"
                    rows={circleGroups.map((c) => ({ label: c.circleName, agg: c.agg }))}
                    totals={circleGroups.reduce((a, c) => combineAgg(a, c.agg), newAgg())}
                    palette={p}
                    totalLabel={`Total (${totalCirclesCount} Circles)`}
                  />
                )}
              </Card>
            ) : (
              <Card>
                <SectionTitle
                  title="Moza Wise Variety Summary"
                  subtitle={`Grouped by circle with circle subtotals (${totalMozasCount} Mozas in total)`}
                />
                {mozaByCircle.length === 0 ? (
                  <EmptyState message="No data found." />
                ) : (
                  mozaByCircle.map((c, i) => {
                    const cTot = c.mozas.reduce((a, m) => combineAgg(a, m.agg), newAgg());
                    const mozaCount = c.mozas.length;
                    return (
                      <View key={i} style={{ marginBottom: 16 }}>
                        <View style={[styles.groupHeader, { borderBottomColor: p.border }]}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: p.primary }}>
                            {c.circleName}
                          </Text>
                          <Text style={{ fontSize: 11, color: p.textMuted }}>
                            {c.zoneName} ({mozaCount} Mozas)
                          </Text>
                        </View>
                        <VarietyTable
                          labelHeader="Moza"
                          rows={c.mozas.map((m) => ({ label: m.mozaName, agg: m.agg }))}
                          totals={cTot}
                          palette={p}
                          totalLabel={`Circle Total (${mozaCount} Mozas)`}
                        />
                      </View>
                    );
                  })
                )}
                <View style={{ marginTop: 8 }}>
                  <VarietyTable
                    labelHeader=""
                    rows={[]}
                    totals={grand}
                    palette={p}
                    totalLabel={`Grand Total (${totalCirclesCount} Circles, ${totalMozasCount} Mozas)`}
                    totalsOnly
                  />
                </View>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <EmptyState message="Set filters and tap Run Report to generate." />
          </Card>
        )}
      </ScrollView>
    </AppShell>
  );
}

function VarietyTable({
  labelHeader,
  rows,
  totals,
  palette: p,
  totalLabel = 'Total',
  totalsOnly,
}: {
  labelHeader: string;
  rows: { label: string; agg: VarietyAgg }[];
  totals: VarietyAgg;
  palette: any;
  totalLabel?: string;
  totalsOnly?: boolean;
}) {
  const totalCells = aggCells(totals);
  
  // Grand Total Area = Row ka aakhri cell value
  const grandTotalArea = parseNum(totalCells[totalCells.length - 1]);

  // Specific Columns Styling (Colors & Weight)
  const getColumnStyle = (headerName: string) => {
    const h = headerName.trim().toUpperCase();
    if (h === 'T.V') return { color: '#38bdf8', fontWeight: '800' as const }; // Bright Blue
    if (h === 'T.NV') return { color: '#f97316', fontWeight: '800' as const }; // Vibrant Orange
    if (h === 'G TOTAL' || h === 'G.TOTAL' || h === 'TOTAL') return { color: '#10b981', fontWeight: '800' as const }; // Emerald Green
    return {};
  };

  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      {/* Table Header */}
      <View style={[styles.row, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border, paddingVertical: 10 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.textMuted, fontWeight: '700', fontSize: 12 }]}>
          {labelHeader}
        </Text>
        {VARIETY_HEADERS.map((h) => {
          const customStyle = getColumnStyle(h);
          return (
            <Text
              key={h}
              style={[
                styles.cell,
                { flex: 1, color: p.textMuted, fontWeight: '700', textAlign: 'center', fontSize: 12 },
                customStyle,
              ]}
            >
              {h}
            </Text>
          );
        })}
      </View>

      {/* Data Rows */}
      {!totalsOnly
        ? rows.map((r, i) => {
            const rowCells = aggCells(r.agg);
            return (
              <View
                key={i}
                style={[
                  styles.row,
                  { borderBottomColor: p.border, backgroundColor: i % 2 === 0 ? p.surface : p.surfaceAlt, paddingVertical: 10 },
                ]}
              >
                <Text style={[styles.cell, { flex: 1.4, color: p.text, fontWeight: '600', fontSize: 12 }]}>
                  {r.label}
                </Text>
                {rowCells.map((c, j) => {
                  const headerName = VARIETY_HEADERS[j] || '';
                  const customStyle = getColumnStyle(headerName);
                  return (
                    <Text
                      key={j}
                      style={[
                        styles.cell,
                        { flex: 1, color: p.text, textAlign: 'center', fontSize: 12, fontWeight: '600' },
                        customStyle,
                      ]}
                    >
                      {c}
                    </Text>
                  );
                })}
              </View>
            );
          })
        : null}

      {/* Totals Row */}
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomColor: p.border, paddingVertical: 10 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800', fontSize: 13 }]}>
          {totalLabel}
        </Text>
        {totalCells.map((c, j) => (
          <Text
            key={j}
            style={[
              styles.cell,
              { flex: 1, color: p.primary, fontWeight: '800', textAlign: 'center', fontSize: 12 },
            ]}
          >
            {c}
          </Text>
        ))}
      </View>

      {/* Percentage Row (Divided by Grand Total Area) */}
      <View style={[styles.row, { backgroundColor: p.surfaceAlt, borderBottomWidth: 0, paddingVertical: 10 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.textMuted, fontWeight: '700', fontSize: 12 }]}>
          Percentage (%)
        </Text>
        {totalCells.map((c, j) => {
          const headerName = (VARIETY_HEADERS[j] || '').toLowerCase();
          const isGrower = j === 0 || headerName.includes('grower') || headerName.includes('no');

          if (isGrower) {
            return (
              <Text
                key={j}
                style={[styles.cell, { flex: 1, color: p.textMuted, textAlign: 'center', fontSize: 12 }]}
              >
                -
              </Text>
            );
          }

          const num = parseNum(c);
          const pct = grandTotalArea > 0 ? ((num / grandTotalArea) * 100).toFixed(1) : '0.0';

          return (
            <Text
              key={j}
              style={[
                styles.cell,
                { flex: 1, color: p.primary, fontWeight: '700', textAlign: 'center', fontSize: 12 },
              ]}
            >
              {pct}%
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    zIndex: 100,
  },
  filterItem: {
    flex: 1,
    minWidth: 160,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectBox: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
    width: '100%',
  } as any,
  backdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  dropdownSearchInput: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 12,
  },
  optionRow: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16, gap: 8 },
  tab: { paddingVertical: 10, paddingHorizontal: 16 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  cell: { fontSize: 12 },
});
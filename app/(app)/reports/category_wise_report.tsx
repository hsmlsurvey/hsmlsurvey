import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, SectionTitle, EmptyState, ErrorText, Input } from '@/components/ui';
import {
  useReportData,
  ReportFilters,
  emptyFilters,
  cleanZone,
  FlatRow,
} from '@/components/ReportCommon';

function num(v: any): number {
  return Number(v ?? 0);
}

// Helper: Checks active state using 'status' column
function isActive(item: any): boolean {
  if (!item) return true;
  if (item.status === undefined || item.status === null || item.status === '') return true;
  const s = String(item.status).toLowerCase().trim();
  return s === 'active' || s === '1' || s === 'true';
}

const CATEGORIES = [
  { label: '0.1 - 5', min: 0.1, max: 5 },
  { label: '5.1 - 10', min: 5.1, max: 10 },
  { label: '10.1 - 15', min: 10.1, max: 15 },
  { label: '15.1 - 25', min: 15.1, max: 25 },
  { label: '25.1 - 50', min: 25.1, max: 50 },
  { label: '50.1+', min: 50.1, max: Infinity },
];

type Tab = 'circle' | 'moza';

interface OptionItem {
  label: string;
  value: string;
}

const getMasterPassbookKey = (r: any): string => {
  const mp = r.master_passbook ?? r.passbook ?? r.grower_passbook;
  if (mp !== null && mp !== undefined && String(mp).trim() !== '' && String(mp) !== 'null' && String(mp) !== 'undefined') {
    return String(mp).trim();
  }
  const gId = r.grower_id ?? r.id;
  if (gId !== null && gId !== undefined && String(gId).trim() !== '' && String(gId) !== 'null' && String(gId) !== 'undefined') {
    return `grower_${String(gId).trim()}`;
  }
  return `${String(r.grower_name || '').trim()}|${String(r.cnic || '').trim()}`;
};

function categorize(rows: FlatRow[]) {
  return CATEGORIES.map((cat) => {
    const inRange = rows.filter((r) => r.total_acre >= cat.min && r.total_acre <= cat.max);
    const growers = new Set(inRange.map((r) => getMasterPassbookKey(r))).size;
    const acres = inRange.reduce((a, r) => a + r.total_acre, 0);
    return { label: cat.label, growers, acres };
  });
}

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

export default function Report2Screen() {
  const p = usePalette();
  const { rows, zoneNumbers, zoneTypes, circles, mozas, loading, error } = useReportData();
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);
  const [tab, setTab] = useState<Tab>('circle');

  // Relational Lookup Maps
  const zoneNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    zoneNumbers.forEach((z: any) => {
      if (!isActive(z)) return;
      const numStr = cleanZone(z.zone_number ?? z.number ?? z.id);
      if (z.id) map.set(String(z.id), numStr);
      if (numStr) map.set(numStr, numStr);
    });
    return map;
  }, [zoneNumbers]);

  const zoneTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    zoneTypes.forEach((t: any) => {
      if (!isActive(t)) return;
      const typeStr = String(t.zone_type ?? t.name ?? t.id ?? '').trim();
      if (t.id) map.set(String(t.id), typeStr);
      if (typeStr) map.set(typeStr.toLowerCase(), typeStr);
    });
    return map;
  }, [zoneTypes]);

  // Set of Active Circles (By ID and Circle Code)
  const activeCircleKeys = useMemo(() => {
    const set = new Set<string>();
    circles.forEach((c: any) => {
      if (isActive(c)) {
        if (c.id !== undefined && c.id !== null) set.add(String(c.id));
        if (c.circle_code !== undefined && c.circle_code !== null) set.add(String(c.circle_code));
      }
    });
    return set;
  }, [circles]);

  const circleZoneMap = useMemo(() => {
    const map = new Map<string, { zoneNumber: string; zoneType: string }>();
    circles.forEach((c: any) => {
      if (!isActive(c)) return;
      const zNum = cleanZone(c.zone_number) || zoneNumberMap.get(String(c.zone_number_id || c.zone_id || '')) || '';
      const zType = String(c.zone_type || zoneTypeMap.get(String(c.zone_type_id || '')) || '').trim();
      
      const info = { zoneNumber: zNum, zoneType: zType };
      if (c.id) map.set(String(c.id), info);
      if (c.circle_code) map.set(String(c.circle_code), info);
    });
    return map;
  }, [circles, zoneNumberMap, zoneTypeMap]);

  // Clean Dropdown Lists
  const cleanZoneNumbersList = useMemo(() => {
    const set = new Set<string>();
    const list: { val: string; display: string }[] = [];
    zoneNumbers.forEach((z: any) => {
      if (!isActive(z)) return;
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
      if (!isActive(t)) return;
      const val = typeof t === 'object' ? (t.zone_type ?? t.name ?? t.id) : t;
      const s = String(val || '').trim();
      if (s && !set.has(s.toLowerCase())) {
        set.add(s.toLowerCase());
        list.push(s);
      }
    });
    return list;
  }, [zoneTypes]);

  // Filter Circles for Dropdown
  const filteredCircles = useMemo(() => {
    return circles.filter((c: any) => {
      if (!isActive(c)) return false;

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

  // Filter Mozas for Dropdown (Only show Mozas belonging to ACTIVE Circles)
  const filteredMozas = useMemo(() => {
    return mozas.filter((m: any) => {
      // 1. Check if Moza itself is active
      if (!isActive(m)) return false;

      // 2. Check if Parent Circle is active
      const parentCircleKey = String(m.circle_id || m.circle_code || '');
      if (parentCircleKey && !activeCircleKeys.has(parentCircleKey)) {
        return false;
      }

      const parentCircleInfo = circleZoneMap.get(parentCircleKey);
      
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
  }, [mozas, activeCircleKeys, filters.zoneNumber, filters.zoneType, (filters as any).circle, zoneNumberMap, zoneTypeMap, circleZoneMap]);

  // Dropdown Options
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

  // Filter Passbook Rows
  const filteredRows = useMemo(() => {
    return rows.filter((r: any) => {
      if (!isActive(r)) return false;

      // Check if Circle associated with row is active
      const rCircleKey = String(r.circle_id || r.circle_code || '');
      if (rCircleKey && !activeCircleKeys.has(rCircleKey)) {
        return false;
      }

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
      if (filters.fromAcre && r.total_acre < num(filters.fromAcre)) return false;
      if (filters.toAcre && r.total_acre > num(filters.toAcre)) return false;

      return true;
    });
  }, [rows, activeCircleKeys, filters, zoneNumberMap, zoneTypeMap]);

  // Grouping & Sorting by Circle Code
  const circleGroups = useMemo(() => {
    const map = new Map<string, { circleCode: string; circleName: string; zoneName: string; rows: FlatRow[] }>();
    
    filteredRows.forEach((r) => {
      const key = String(r.circle_id || r.circle_code || '__none__');
      if (!map.has(key)) {
        const cObj = circles.find((c: any) => String(c.id) === String(r.circle_id) || String(c.circle_code) === String(r.circle_code));
        const code = String(r.circle_code || (cObj as any)?.circle_code || '');
        const name = r.circle_name || cObj?.circle_name || 'Unknown Circle';

        map.set(key, {
          circleCode: code,
          circleName: name,
          zoneName: r.zone_number ? `Zone ${cleanZone(r.zone_number)} (${r.zone_type || ''})` : '-',
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.circleCode.localeCompare(b.circleCode, undefined, { numeric: true })
    );
  }, [filteredRows, circles]);

  // Grouping & Sorting by Moza Code inside Circle
  const mozaByCircle = useMemo(() => {
    const map = new Map<
      string,
      {
        circleCode: string;
        circleName: string;
        zoneName: string;
        mozaMap: Map<string, { mozaCode: string; mozaName: string; rows: FlatRow[] }>;
      }
    >();

    filteredRows.forEach((r) => {
      const ckey = String(r.circle_id || r.circle_code || '__none__');
      if (!map.has(ckey)) {
        const cObj = circles.find((c: any) => String(c.id) === String(r.circle_id) || String(c.circle_code) === String(r.circle_code));
        const cCode = String(r.circle_code || (cObj as any)?.circle_code || '');
        const cName = r.circle_name || cObj?.circle_name || 'Unknown Circle';

        map.set(ckey, {
          circleCode: cCode,
          circleName: cName,
          zoneName: r.zone_number ? `Zone ${cleanZone(r.zone_number)} (${r.zone_type || ''})` : '-',
          mozaMap: new Map(),
        });
      }

      const cGroup = map.get(ckey)!;
      const mkey = String(r.moza_id || r.moza_code || '__none__');

      if (!cGroup.mozaMap.has(mkey)) {
        const mObj = mozas.find((m: any) => String(m.id) === String(r.moza_id) || String(m.moza_code) === String(r.moza_code));
        const mCode = String(r.moza_code || (mObj as any)?.moza_code || '');
        const mName = r.moza_name || mObj?.moza_name || 'Unknown Moza';

        cGroup.mozaMap.set(mkey, {
          mozaCode: mCode,
          mozaName: mName,
          rows: [],
        });
      }

      cGroup.mozaMap.get(mkey)!.rows.push(r);
    });

    return Array.from(map.values())
      .map((c) => ({
        circleCode: c.circleCode,
        circleName: c.circleName,
        zoneName: c.zoneName,
        mozas: Array.from(c.mozaMap.values()).sort((a, b) =>
          a.mozaCode.localeCompare(b.mozaCode, undefined, { numeric: true })
        ),
      }))
      .sort((a, b) =>
        a.circleCode.localeCompare(b.circleCode, undefined, { numeric: true })
      );
  }, [filteredRows, circles, mozas]);

  const totalMozasCount = useMemo(() => {
    return mozaByCircle.reduce((sum, c) => sum + c.mozas.length, 0);
  }, [mozaByCircle]);

  const grandCat = useMemo(() => categorize(filteredRows), [filteredRows]);
  
  const grandTotalGrowers = useMemo(() => {
    return new Set(filteredRows.map((r) => getMasterPassbookKey(r))).size;
  }, [filteredRows]);

  const grandTotalAcres = useMemo(() => {
    return filteredRows.reduce((a, r) => a + r.total_acre, 0);
  }, [filteredRows]);

  return (
    <AppShell title="Category Wise Summary">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <Card style={{ marginBottom: 16, zIndex: 100, overflow: 'visible' }}>
          <SectionTitle title="Filters" subtitle="Cascading Filters with Code-Wise Sorting & Acre Range" />

          <View style={styles.filterGrid}>
            {/* Zone Number */}
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

            {/* Zone Type */}
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

            {/* Circle Dropdown */}
            <SearchableSelect
              label="Circle [Code - Name]"
              placeholder={`All Circles (${circleOptions.length})`}
              searchPlaceholder="Search Circle..."
              options={circleOptions}
              value={(filters as any).circle || ''}
              onChange={(val) => setFilters((prev: any) => ({ ...prev, circle: val, moza: '' }))}
              palette={p}
            />

            {/* Moza Dropdown */}
            <SearchableSelect
              label="Moza [Code - Name]"
              placeholder={`All Mozas (${mozaOptions.length})`}
              searchPlaceholder="Search Moza..."
              options={mozaOptions}
              value={(filters as any).moza || ''}
              onChange={(val) => setFilters((prev: any) => ({ ...prev, moza: val }))}
              palette={p}
            />

            {/* Acre Range Inputs */}
            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: p.textMuted }]}>From Acre</Text>
              <Input
                value={filters.fromAcre}
                onChangeText={(t) => setFilters((prev) => ({ ...prev, fromAcre: t }))}
                placeholder="0.0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: p.textMuted }]}>To Acre</Text>
              <Input
                value={filters.toAcre}
                onChangeText={(t) => setFilters((prev) => ({ ...prev, toAcre: t }))}
                placeholder="Max"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Action Buttons */}
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
            <EmptyState message="Loading report data..." />
          </Card>
        ) : ran || Object.values(filters).some(Boolean) ? (
          <>
            {/* Tabs */}
            <View style={[styles.tabBar, { borderBottomColor: p.border }]}>
              <TouchableOpacity
                onPress={() => setTab('circle')}
                style={[styles.tab, tab === 'circle' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === 'circle' ? p.primary : p.textMuted }}>
                  Circle Wise Category ({circleGroups.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTab('moza')}
                style={[styles.tab, tab === 'moza' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === 'moza' ? p.primary : p.textMuted }}>
                  Moza Wise Category ({totalMozasCount} Mozas)
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'circle' ? (
              <Card>
                <SectionTitle title="Circle Wise Category Wise Report" subtitle={`Displaying ${circleGroups.length} Circles sorted by Circle Code`} />
                {circleGroups.length === 0 ? (
                  <EmptyState message="No data." />
                ) : (
                  <CategoryTable
                    labelHeader="Circle"
                    groups={circleGroups.map((c) => ({ label: c.circleName, rows: c.rows }))}
                    totalLabel={`Total (${circleGroups.length} Circles, ${totalMozasCount} Mozas)`}
                    palette={p}
                  />
                )}
              </Card>
            ) : (
              <Card>
                <SectionTitle title="Moza Wise Category Wise Report" subtitle={`Displaying ${totalMozasCount} Mozas across ${mozaByCircle.length} Circles`} />
                {mozaByCircle.length === 0 ? (
                  <EmptyState message="No data." />
                ) : (
                  mozaByCircle.map((c, i) => (
                    <View key={i} style={{ marginBottom: 16 }}>
                      <View style={[styles.groupHeader, { borderBottomColor: p.border }]}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: p.primary }}>{c.circleName}</Text>
                        <Text style={{ fontSize: 11, color: p.textMuted }}>
                          {c.zoneName} • {c.mozas.length} Mozas
                        </Text>
                      </View>
                      <CategoryTable
                        labelHeader="Moza"
                        groups={c.mozas.map((m) => ({ label: m.mozaName, rows: m.rows }))}
                        totalLabel={`Circle Total (${c.mozas.length} Mozas)`}
                        palette={p}
                      />
                    </View>
                  ))
                )}
                <View style={{ marginTop: 8 }}>
                  <GrandCategoryRow
                    cats={grandCat}
                    totalLabel={`Grand Total (${totalMozasCount} Mozas)`}
                    totalGrowers={grandTotalGrowers}
                    totalAcres={grandTotalAcres}
                    palette={p}
                  />
                </View>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <EmptyState message="Set filters and tap Run Report. Use From/To Acre to narrow the range, or leave blank for all categories." />
          </Card>
        )}
      </ScrollView>
    </AppShell>
  );
}

function CategoryTable({
  labelHeader,
  groups,
  totalLabel = 'Total',
  palette: p,
}: {
  labelHeader: string;
  groups: { label: string; rows: FlatRow[] }[];
  totalLabel?: string;
  palette: any;
}) {
  const allCats = CATEGORIES;

  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      {/* Table Header with Stacked Growers & Categories */}
      <View style={[styles.row, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.textMuted, fontWeight: '700', fontSize: 12 }]}>{labelHeader}</Text>
        {allCats.map((cat) => (
          <View key={cat.label} style={styles.stackedCell}>
            <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600', textTransform: 'uppercase' }}>GROWERS</Text>
            <Text style={{ fontSize: 12, color: p.text, fontWeight: '700' }}>{cat.label}</Text>
          </View>
        ))}
        {/* Total Column Header */}
        <View style={styles.stackedCell}>
          <Text style={{ fontSize: 10, color: p.primary, fontWeight: '600', textTransform: 'uppercase' }}>OVERALL</Text>
          <Text style={{ fontSize: 12, color: p.primary, fontWeight: '800' }}>Total</Text>
        </View>
      </View>

      {/* Row Data */}
      {groups.map((g, i) => {
        const cats = categorize(g.rows);
        const rowTotalGrowers = new Set(g.rows.map((r) => getMasterPassbookKey(r))).size;
        const rowTotalAcres = g.rows.reduce((a, r) => a + r.total_acre, 0);

        return (
          <View key={i} style={[styles.row, { borderBottomColor: p.border, backgroundColor: i % 2 === 0 ? p.surface : p.surfaceAlt }]}>
            <Text style={[styles.cell, { flex: 1.4, color: p.text, fontWeight: '600', fontSize: 13 }]}>{g.label}</Text>
            {cats.map((c) => (
              <View key={c.label} style={styles.stackedCell}>
                <Text style={{ fontSize: 13, color: p.text, fontWeight: '600' }}>{c.growers}</Text>
                <Text style={{ fontSize: 13, color: p.text, fontWeight: '600' }}>{c.acres.toFixed(1)}</Text>
              </View>
            ))}
            {/* Row Total */}
            <View style={[styles.stackedCell, { backgroundColor: p.primarySoft + '33', borderRadius: 4, paddingVertical: 2 }]}>
              <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{rowTotalGrowers}</Text>
              <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{rowTotalAcres.toFixed(1)}</Text>
            </View>
          </View>
        );
      })}

      {/* Total Values Row */}
      {(() => {
        const allRows = groups.flatMap((g) => g.rows);
        const cats = categorize(allRows);
        const tableTotalGrowers = new Set(allRows.map((r) => getMasterPassbookKey(r))).size;
        const tableTotalAcres = allRows.reduce((a, r) => a + r.total_acre, 0);

        return (
          <>
            <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomColor: p.border }]}>
              <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800', fontSize: 13 }]}>{totalLabel}</Text>
              {cats.map((c) => (
                <View key={c.label} style={styles.stackedCell}>
                  <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{c.growers}</Text>
                  <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{c.acres.toFixed(1)}</Text>
                </View>
              ))}
              <View style={styles.stackedCell}>
                <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{tableTotalGrowers}</Text>
                <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{tableTotalAcres.toFixed(1)}</Text>
              </View>
            </View>

            {/* Separate Percentage Row */}
            <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomWidth: 0 }]}>
              <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800', fontSize: 13 }]}>Percentage (%)</Text>
              {cats.map((c) => {
                const growerPct = tableTotalGrowers > 0 ? ((c.growers / tableTotalGrowers) * 100).toFixed(1) : '0.0';
                const acrePct = tableTotalAcres > 0 ? ((c.acres / tableTotalAcres) * 100).toFixed(1) : '0.0';

                return (
                  <View key={c.label} style={styles.stackedCell}>
                    <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{growerPct}%</Text>
                    <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{acrePct}%</Text>
                  </View>
                );
              })}
              <View style={styles.stackedCell}>
                <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>100.0%</Text>
                <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>100.0%</Text>
              </View>
            </View>
          </>
        );
      })()}
    </View>
  );
}

function GrandCategoryRow({
  cats,
  totalLabel,
  totalGrowers,
  totalAcres,
  palette: p,
}: {
  cats: { label: string; growers: number; acres: number }[];
  totalLabel: string;
  totalGrowers: number;
  totalAcres: number;
  palette: any;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: 'hidden' }}>
      {/* Grand Total Values Row */}
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomColor: p.border }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800', fontSize: 13 }]}>{totalLabel}</Text>
        {cats.map((c) => (
          <View key={c.label} style={styles.stackedCell}>
            <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{c.growers}</Text>
            <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{c.acres.toFixed(1)}</Text>
          </View>
        ))}
        <View style={styles.stackedCell}>
          <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{totalGrowers}</Text>
          <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{totalAcres.toFixed(1)}</Text>
        </View>
      </View>

      {/* Grand Total Percentage Row */}
      <View style={[styles.row, { backgroundColor: p.primarySoft, borderBottomWidth: 0 }]}>
        <Text style={[styles.cell, { flex: 1.4, color: p.primary, fontWeight: '800', fontSize: 13 }]}>Percentage (%)</Text>
        {cats.map((c) => {
          const growerPct = totalGrowers > 0 ? ((c.growers / totalGrowers) * 100).toFixed(1) : '0.0';
          const acrePct = totalAcres > 0 ? ((c.acres / totalAcres) * 100).toFixed(1) : '0.0';

          return (
            <View key={c.label} style={styles.stackedCell}>
              <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{growerPct}%</Text>
              <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>{acrePct}%</Text>
            </View>
          );
        })}
        <View style={styles.stackedCell}>
          <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>100.0%</Text>
          <Text style={{ fontSize: 13, color: p.primary, fontWeight: '800' }}>100.0%</Text>
        </View>
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
    minWidth: 150,
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
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  cell: { fontSize: 12 },
  stackedCell: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
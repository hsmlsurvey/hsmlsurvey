import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useColorScheme, ActivityIndicator } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, SectionTitle, EmptyState, ErrorText } from '@/components/ui';
import { useReportData, ReportFilters, emptyFilters, FlatRow, cleanZone } from '@/components/ReportCommon';

interface OptionItem {
  label: string;
  value: string;
}

const TABLE_WIDTH = 1465;

// Excel Cell Component with customizable borders
function ExcelCell({
  width,
  bgColor,
  align = 'center',
  borderColor,
  borderTopWidth = 0,
  borderBottomWidth = 1,
  children,
}: {
  width: number;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  borderColor?: string;
  borderTopWidth?: number;
  borderBottomWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        width,
        minHeight: 38,
        backgroundColor: bgColor || 'transparent',
        justifyContent: 'center',
        alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderTopWidth,
        borderBottomWidth,
        borderColor: borderColor || 'transparent',
      }}
    >
      {children}
    </View>
  );
}

// Sleek Loader Component
function SleekLoader({ palette: p }: { palette: any }) {
  return (
    <Card style={styles.loaderCard}>
      <View style={styles.loaderContent}>
        <ActivityIndicator size="large" color={p.primary} style={{ transform: [{ scale: 1.1 }] }} />
        <Text style={[styles.loaderTitle, { color: p.text }]}>Fetching Grower Details...</Text>
        <Text style={[styles.loaderSubText, { color: p.textMuted }]}>
          Please wait while we prepare the Moza report data
        </Text>
      </View>
    </Card>
  );
}

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

            <ScrollView 
              style={{ maxHeight: 220 }} 
              nestedScrollEnabled 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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

export default function Report4Screen() {
  const p = usePalette();
  const colorScheme = useColorScheme();
  
  const isDark = colorScheme === 'dark' || Boolean((p as any).isDark);

  // Unique Highlight Font Colors
  const tvColor = isDark ? '#38bdf8' : '#0284c7';     // Cyan / Sky Blue for T.V
  const tnvColor = isDark ? '#f59e0b' : '#d97706';    // Amber / Gold for T.NV
  const grandColor = isDark ? '#34d399' : '#059669';  // Emerald Green for G TOTAL

  const reportData = useReportData() as any;
  const { rows, zoneNumbers = [], zoneTypes = [], circles = [], mozas = [], loading, error } = reportData;
  
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Columns List
  const columns = useMemo(() => [
    { key: 'passbook_number', label: 'PASSBOOK#', width: 110, align: 'left' as const },
    { key: 'grower_name', label: 'GROWER / FATHER', width: 180, align: 'left' as const },
    { key: 'cnic', label: 'CNIC / CELL#', width: 140, align: 'left' as const },
    { key: 'bank_title', label: 'BANK / ACC#', width: 180, align: 'left' as const },
    { key: 'transport_type', label: 'TRANSPORT', width: 110, align: 'left' as const },
    { key: 'variety_mondha', label: 'V.M', width: 80, align: 'center' as const },
    { key: 'variety_sanma', label: 'V.S', width: 80, align: 'center' as const },
    { key: '_tv', label: 'T.V', width: 85, align: 'center' as const, isTv: true },
    { key: 'non_variety_mondha', label: 'NV.M', width: 80, align: 'center' as const },
    { key: 'non_variety_sanma', label: 'NV.S', width: 80, align: 'center' as const },
    { key: '_tnv', label: 'T.NV', width: 85, align: 'center' as const, isTnv: true },
    { key: 'total_mondha', label: 'T.M', width: 80, align: 'center' as const },
    { key: 'total_sanma', label: 'T.S', width: 80, align: 'center' as const },
    { key: 'grand_total', label: 'G TOTAL', width: 95, align: 'center' as const, isGrand: true },
  ], []);

  // Mappings
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

  // Option Lists
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

      if (filters.zoneNumber && cZoneNum && cZoneNum !== cleanZone(filters.zoneNumber)) return false;
      if (filters.zoneType && cZoneType && cZoneType.toLowerCase() !== filters.zoneType.toLowerCase()) return false;
      return true;
    }).sort((a: any, b: any) =>
      String(a.circle_code || '').localeCompare(String(b.circle_code || ''), undefined, { numeric: true })
    );
  }, [circles, filters.zoneNumber, filters.zoneType, zoneNumberMap, zoneTypeMap]);

  const filteredMozas = useMemo(() => {
    return mozas.filter((m: any) => {
      const parentCircleInfo = circleZoneMap.get(String(m.circle_id || m.circle_code || ''));
      const mZoneNum = cleanZone(m.zone_number) || zoneNumberMap.get(String(m.zone_number_id || m.zone_id || '')) || parentCircleInfo?.zoneNumber || '';
      const mZoneType = String(m.zone_type || zoneTypeMap.get(String(m.zone_type_id || m.zone_id || '')) || parentCircleInfo?.zoneType || '').trim();

      if (filters.zoneNumber && mZoneNum && mZoneNum !== cleanZone(filters.zoneNumber)) return false;
      if (filters.zoneType && mZoneType && mZoneType.toLowerCase() !== filters.zoneType.toLowerCase()) return false;
      if ((filters as any).circle) {
        if (String(m.circle_id || m.circle_code || '') !== String((filters as any).circle)) return false;
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

  const handleRunReport = () => {
    if (!(filters as any).moza) {
      setValidationError('Please select a Moza first before running the report.');
      setRan(false);
      return;
    }
    setValidationError(null);
    setRan(true);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setRan(false);
    setValidationError(null);
  };

  const filtered = useMemo(() => {
    if (!ran || !(filters as any).moza) return [];

    return (rows || []).filter((r: any) => {
      const rZoneNum = cleanZone(r.zone_number) || zoneNumberMap.get(String(r.zone_number_id || '')) || '';
      const rZoneType = String(r.zone_type || zoneTypeMap.get(String(r.zone_type_id || '')) || '').trim();

      if (filters.zoneNumber && rZoneNum !== cleanZone(filters.zoneNumber)) return false;
      if (filters.zoneType && rZoneType.toLowerCase() !== filters.zoneType.toLowerCase()) return false;
      if ((filters as any).circle) {
        const selC = String((filters as any).circle);
        if (String(r.circle_id || '') !== selC && String(r.circle_code || '') !== selC) return false;
      }
      if ((filters as any).moza) {
        const selM = String((filters as any).moza);
        if (String(r.moza_id || '') !== selM && String(r.moza_code || '') !== selM) return false;
      }
      return true;
    });
  }, [rows, filters, ran, zoneNumberMap, zoneTypeMap]);

  const mozaGroups = useMemo(() => {
    const map = new Map<string, { mozaName: string; circleName: string; zoneName: string; rows: FlatRow[] }>();
    filtered.forEach((r: any) => {
      const key = r.moza_id || '__none__';
      if (!map.has(key)) {
        const zoneFormatted = r.zone_number ? `Zone ${r.zone_number}${r.zone_type ? ` (${r.zone_type})` : ''}` : '-';
        map.set(key, {
          mozaName: r.moza_name || 'Unknown',
          circleName: r.circle_name || '-',
          zoneName: zoneFormatted,
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  return (
    <AppShell title="Grower Wise Details">
      {/* CSS injected to force native browser scrollbar display */}
      <style>{`
        .table-scroll-container {
          overflow-x: auto !important;
          max-width: 100% !important;
          display: block !important;
          scrollbar-width: thin !important;
          scrollbar-color: ${p.primary || '#38bdf8'} rgba(255, 255, 255, 0.1) !important;
        }
        .table-scroll-container::-webkit-scrollbar {
          height: 12px !important;
          display: block !important;
        }
        .table-scroll-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08) !important;
          border-radius: 6px !important;
        }
        .table-scroll-container::-webkit-scrollbar-thumb {
          background: ${p.primary || '#38bdf8'} !important;
          border-radius: 6px !important;
          border: 2px solid #0f172a !important;
        }
        .table-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #0284c7 !important;
        }
      `}</style>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters Card */}
        <Card style={{ marginBottom: 16, zIndex: 100, overflow: 'visible' }}>
          <SectionTitle title="Filters" subtitle="Cascading Filters (Moza Selection Required)" />

          <View style={styles.filterGrid}>
            {/* Zone Number */}
            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: p.textMuted }]}>Zone #</Text>
              <select
                value={cleanZone(filters.zoneNumber) || ''}
                onChange={(e) => {
                  setFilters((prev: any) => ({ ...prev, zoneNumber: e.target.value, circle: '', moza: '' }));
                  setValidationError(null);
                }}
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
                onChange={(e) => {
                  setFilters((prev: any) => ({ ...prev, zoneType: e.target.value, circle: '', moza: '' }));
                  setValidationError(null);
                }}
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
              onChange={(val) => {
                setFilters((prev: any) => ({ ...prev, circle: val, moza: '' }));
                setValidationError(null);
              }}
              palette={p}
            />

            {/* Moza Dropdown */}
            <SearchableSelect
              label="Moza [Code - Name] *"
              placeholder={`Select Moza (${mozaOptions.length})`}
              searchPlaceholder="Search Moza..."
              options={mozaOptions}
              value={(filters as any).moza || ''}
              onChange={(val) => {
                setFilters((prev: any) => ({ ...prev, moza: val }));
                if (val) setValidationError(null);
              }}
              palette={p}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={handleClearFilters}
              style={[styles.btn, { backgroundColor: p.surfaceAlt, borderColor: p.border, borderWidth: 1 }]}
            >
              <Text style={{ color: p.text, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRunReport}
              style={[styles.btn, { backgroundColor: p.primary }]}
            >
              <Text style={{ color: p.primaryText, fontWeight: '700' }}>Run Report</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Validation Warning */}
        {validationError ? (
          <Card style={{ marginBottom: 16, borderColor: '#f59e0b', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbe2' }}>
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#fbbf24' : '#d97706', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                ⚠️ {validationError}
              </Text>
            </View>
          </Card>
        ) : null}

        {error ? <ErrorText message={error} /> : null}

        {/* Loader */}
        {loading ? (
          <SleekLoader palette={p} />
        ) : ran && (filters as any).moza ? (
          <>
            {mozaGroups.length === 0 ? (
              <Card><EmptyState message="No data found for selected Moza." /></Card>
            ) : (
              /* HTML DIV USED HERE FOR FORCED BROWSER HORIZONTAL SCROLLBAR */
              <div className="table-scroll-container" style={{ width: '100%', paddingBottom: 12 }}>
                <View style={{ width: TABLE_WIDTH }}>
                  {mozaGroups.map((g, i) => {
                    const tot = g.rows.reduce((a: any, r: any) => ({
                      vm: a.vm + r.variety_mondha, vs: a.vs + r.variety_sanma,
                      nvm: a.nvm + r.non_variety_mondha, nvs: a.nvs + r.non_variety_sanma,
                      tm: a.tm + r.total_mondha, ts: a.ts + r.total_sanma,
                      grand: a.grand + r.grand_total,
                    }), { vm: 0, vs: 0, nvm: 0, nvs: 0, tm: 0, ts: 0, grand: 0 });

                    return (
                      <Card key={i} style={{ marginBottom: 20, padding: 0, overflow: 'hidden', borderRadius: 8 }}>
                        {/* Moza Banner */}
                        <View style={[styles.mozaHeader, { backgroundColor: p.surfaceAlt }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: p.primary, marginBottom: 2 }}>{g.mozaName}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: p.textMuted }}>
                              {g.zoneName}  ·  <Text style={{ fontWeight: '800', color: p.primary }}>{g.rows.length} grower(s)</Text>
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#8400ff' }} numberOfLines={1}>{g.circleName}</Text>
                          </View>
                        </View>

                        {/* TABLE GRID */}
                        <View style={styles.excelGridWrapper}>
                          
                          {/* 1. Column Header Row */}
                          <View style={styles.excelRow}>
                            {columns.map((col) => {
                              const headerColor = col.isTv ? tvColor : col.isTnv ? tnvColor : col.isGrand ? grandColor : p.text;
                              const fontSize = col.isTv || col.isTnv || col.isGrand ? 12 : 11;

                              return (
                                <ExcelCell
                                  key={col.key}
                                  width={col.width}
                                  align={col.align}
                                  bgColor={p.surfaceAlt}
                                  borderColor={p.border}
                                  borderTopWidth={1}
                                  borderBottomWidth={1}
                                >
                                  <Text style={{ color: headerColor, fontWeight: '800', fontSize, textAlign: col.align }}>
                                    {col.label}
                                  </Text>
                                </ExcelCell>
                              );
                            })}
                          </View>

                          {/* 2. Data Rows */}
                          {g.rows.map((r, rIdx) => (
                            <View key={r.passbook_number ? `${r.passbook_number}-${rIdx}` : rIdx} style={styles.excelRow}>
                              <ExcelCell width={110} align="left" borderColor={p.border}>
                                <Text style={{ color: p.text, fontWeight: '700', fontSize: 12 }}>{r.passbook_number}</Text>
                              </ExcelCell>

                              <ExcelCell width={180} align="left" borderColor={p.border}>
                                <Text style={{ color: p.text, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{r.grower_name}</Text>
                                <Text style={{ color: p.textMuted, fontSize: 10 }} numberOfLines={1}>{r.father_name || '-'}</Text>
                              </ExcelCell>

                              <ExcelCell width={140} align="left" borderColor={p.border}>
                                <Text style={{ color: p.text, fontSize: 11 }}>{r.cnic || '-'}</Text>
                                <Text style={{ color: p.textMuted, fontSize: 10 }}>{r.cell || '-'}</Text>
                              </ExcelCell>

                              <ExcelCell width={180} align="left" borderColor={p.border}>
                                <Text style={{ color: p.text, fontSize: 11 }} numberOfLines={1}>{r.bank_title || '-'}</Text>
                                <Text style={{ color: p.textMuted, fontSize: 10 }}>{r.bank_account || '-'}</Text>
                              </ExcelCell>

                              <ExcelCell width={110} align="left" borderColor={p.border}>
                                <Text style={{ color: p.text, fontSize: 11 }}>{r.transport_type || '-'}</Text>
                              </ExcelCell>

                              <ExcelCell width={80} borderColor={p.border}><Text style={{ color: p.text, fontSize: 11 }}>{r.variety_mondha.toFixed(2)}</Text></ExcelCell>
                              <ExcelCell width={80} borderColor={p.border}><Text style={{ color: p.text, fontSize: 11 }}>{r.variety_sanma.toFixed(2)}</Text></ExcelCell>
                              
                              {/* T.V Highlighted Text */}
                              <ExcelCell width={85} borderColor={p.border}>
                                <Text style={{ color: tvColor, fontWeight: '800', fontSize: 13 }}>
                                  {(r.variety_mondha + r.variety_sanma).toFixed(2)}
                                </Text>
                              </ExcelCell>

                              <ExcelCell width={80} borderColor={p.border}><Text style={{ color: p.text, fontSize: 11 }}>{r.non_variety_mondha.toFixed(2)}</Text></ExcelCell>
                              <ExcelCell width={80} borderColor={p.border}><Text style={{ color: p.text, fontSize: 11 }}>{r.non_variety_sanma.toFixed(2)}</Text></ExcelCell>
                              
                              {/* T.NV Highlighted Text */}
                              <ExcelCell width={85} borderColor={p.border}>
                                <Text style={{ color: tnvColor, fontWeight: '800', fontSize: 13 }}>
                                  {(r.non_variety_mondha + r.non_variety_sanma).toFixed(2)}
                                </Text>
                              </ExcelCell>

                              <ExcelCell width={80} borderColor={p.border}><Text style={{ color: p.text, fontSize: 11 }}>{r.total_mondha.toFixed(2)}</Text></ExcelCell>
                              <ExcelCell width={80} borderColor={p.border}><Text style={{ color: p.text, fontSize: 11 }}>{r.total_sanma.toFixed(2)}</Text></ExcelCell>
                              
                              {/* G TOTAL Highlighted Text */}
                              <ExcelCell width={95} borderColor={p.border}>
                                <Text style={{ color: grandColor, fontWeight: '800', fontSize: 13 }}>
                                  {r.grand_total.toFixed(2)}
                                </Text>
                              </ExcelCell>
                            </View>
                          ))}

                          {/* 3. Moza Total Row */}
                          <View style={styles.excelRow}>
                            <ExcelCell width={720} align="left" bgColor={p.primarySoft} borderColor={p.border}>
                              <Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>MOZA TOTAL</Text>
                            </ExcelCell>

                            <ExcelCell width={80} bgColor={p.primarySoft} borderColor={p.border}><Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>{tot.vm.toFixed(2)}</Text></ExcelCell>
                            <ExcelCell width={80} bgColor={p.primarySoft} borderColor={p.border}><Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>{tot.vs.toFixed(2)}</Text></ExcelCell>
                            
                            {/* T.V Total */}
                            <ExcelCell width={85} bgColor={p.primarySoft} borderColor={p.border}>
                              <Text style={{ color: tvColor, fontWeight: '800', fontSize: 13 }}>
                                {(tot.vm + tot.vs).toFixed(2)}
                              </Text>
                            </ExcelCell>

                            <ExcelCell width={80} bgColor={p.primarySoft} borderColor={p.border}><Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>{tot.nvm.toFixed(2)}</Text></ExcelCell>
                            <ExcelCell width={80} bgColor={p.primarySoft} borderColor={p.border}><Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>{tot.nvs.toFixed(2)}</Text></ExcelCell>
                            
                            {/* T.NV Total */}
                            <ExcelCell width={85} bgColor={p.primarySoft} borderColor={p.border}>
                              <Text style={{ color: tnvColor, fontWeight: '800', fontSize: 13 }}>
                                {(tot.nvm + tot.nvs).toFixed(2)}
                              </Text>
                            </ExcelCell>

                            <ExcelCell width={80} bgColor={p.primarySoft} borderColor={p.border}><Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>{tot.tm.toFixed(2)}</Text></ExcelCell>
                            <ExcelCell width={80} bgColor={p.primarySoft} borderColor={p.border}><Text style={{ color: p.primary, fontWeight: '800', fontSize: 11 }}>{tot.ts.toFixed(2)}</Text></ExcelCell>
                            
                            {/* G TOTAL Total */}
                            <ExcelCell width={95} bgColor={p.primarySoft} borderColor={p.border}>
                              <Text style={{ color: grandColor, fontWeight: '800', fontSize: 13 }}>
                                {tot.grand.toFixed(2)}
                              </Text>
                            </ExcelCell>
                          </View>

                        </View>
                      </Card>
                    );
                  })}
                </View>
              </div>
            )}
          </>
        ) : (
          <Card><EmptyState message="Please select a Moza and tap 'Run Report' to view details." /></Card>
        )}
      </ScrollView>
    </AppShell>
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
  mozaHeader: { 
    padding: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  excelGridWrapper: {
    width: TABLE_WIDTH,
  },
  excelRow: {
    flexDirection: 'row',
  },
  loaderCard: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
  },
  loaderSubText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
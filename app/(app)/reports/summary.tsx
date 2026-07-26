import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { AppShell } from '@/components/AppShell';
import { usePalette, Card, SectionTitle, EmptyState, ErrorText } from '@/components/ui';
import {
  useReportData,
  ReportFilters,
  emptyFilters,
  VarietyAgg,
  newAgg,
  addRow,
  combineAgg,
  cleanZone,
} from '@/components/ReportCommon';

type Tab = 'circle' | 'moza';

interface OptionItem {
  label: string;
  value: string;
}

interface CustomVarietyAgg extends VarietyAgg {
  uniqueGrowers?: Set<string>;
}

// Table headers
const CUSTOM_HEADERS = [
  'Total Growers',
  'Total Variety',
  'Total Non-Variety',
  'Total Mondha',
  'Total Sanma',
  'Grand Total',
];

// Helper to safely parse numbers
const parseNum = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

// Helper: Extract Master Passbook safely
const getMasterPassbook = (r: any, grower: any): string => {
  const mp = r?.master_passbook ?? grower?.master_passbook;

  if (mp !== null && mp !== undefined && String(mp).trim() !== '' && String(mp).trim() !== 'null') {
    return String(mp).trim();
  }

  const gId = r?.grower_id ?? grower?.id ?? r?.id;
  if (gId !== null && gId !== undefined && String(gId).trim() !== '' && String(gId).trim() !== 'null') {
    return `grower_${String(gId).trim()}`;
  }

  return '';
};

// Custom combine function
const combineCustomAgg = (a: VarietyAgg, b: VarietyAgg): CustomVarietyAgg => {
  const res = combineAgg(a, b) as CustomVarietyAgg;
  const setA = (a as CustomVarietyAgg).uniqueGrowers;
  const setB = (b as CustomVarietyAgg).uniqueGrowers;
  const newSet = new Set<string>();
  if (setA) setA.forEach((item) => newSet.add(item));
  if (setB) setB.forEach((item) => newSet.add(item));
  res.uniqueGrowers = newSet;

  // Sum explicit values
  (res as any).v_m = parseNum((a as any).v_m) + parseNum((b as any).v_m);
  (res as any).v_s = parseNum((a as any).v_s) + parseNum((b as any).v_s);
  (res as any).nv_m = parseNum((a as any).nv_m) + parseNum((b as any).nv_m);
  (res as any).nv_s = parseNum((a as any).nv_s) + parseNum((b as any).nv_s);
  (res as any).tot_m = parseNum((a as any).tot_m) + parseNum((b as any).tot_m);
  (res as any).tot_s = parseNum((a as any).tot_s) + parseNum((b as any).tot_s);
  (res as any).grand_total = parseNum((a as any).grand_total) + parseNum((b as any).grand_total);

  return res;
};

// Custom addRow helper
const addRowCustom = (agg: VarietyAgg, r: any) => {
  addRow(agg, r);

  const extAgg = agg as any;

  const mondhaVal = parseNum(r.mondha ?? r.mondha_area ?? r.ratoon ?? r.ratoon_area ?? r.tot_m ?? r.total_mondha);
  const sanmaVal = parseNum(r.sanma ?? r.sanma_area ?? r.plant ?? r.plant_area ?? r.tot_s ?? r.total_sanma);

  const vM = parseNum(
    r.v_m ?? r.vm ?? r.v_mondha ?? r.variety_mondha ?? r.vm_area ?? r.v_m_area ??
    r.V_M ?? r.VM ?? r.V_MONDHA ?? r.VARIETY_MONDHA ??
    ((r.is_variety === true || String(r.variety_type || r.category || '').toUpperCase() === 'V') ? mondhaVal : 0)
  );

  const vS = parseNum(
    r.v_s ?? r.vs ?? r.v_sanma ?? r.variety_sanma ?? r.vs_area ?? r.v_s_area ??
    r.V_S ?? r.VS ?? r.V_SANMA ?? r.VARIETY_SANMA ??
    ((r.is_variety === true || String(r.variety_type || r.category || '').toUpperCase() === 'V') ? sanmaVal : 0)
  );

  const nvM = parseNum(
    r.nv_m ?? r.nvm ?? r.nv_mondha ?? r.non_variety_mondha ?? r.nvm_area ?? r.nv_m_area ??
    r.NV_M ?? r.NVM ?? r.NV_MONDHA ?? r.NON_VARIETY_MONDHA ??
    ((r.is_variety === false || String(r.variety_type || r.category || '').toUpperCase() === 'NV' || String(r.variety_type || r.category || '').toUpperCase() === 'NON-VARIETY') ? mondhaVal : 0)
  );

  const nvS = parseNum(
    r.nv_s ?? r.nvs ?? r.nv_sanma ?? r.non_variety_sanma ?? r.nvs_area ?? r.nv_s_area ??
    r.NV_S ?? r.NVS ?? r.NV_SANMA ?? r.NON_VARIETY_SANMA ??
    ((r.is_variety === false || String(r.variety_type || r.category || '').toUpperCase() === 'NV' || String(r.variety_type || r.category || '').toUpperCase() === 'NON-VARIETY') ? sanmaVal : 0)
  );

  extAgg.v_m = (extAgg.v_m || 0) + vM;
  extAgg.v_s = (extAgg.v_s || 0) + vS;
  extAgg.nv_m = (extAgg.nv_m || 0) + nvM;
  extAgg.nv_s = (extAgg.nv_s || 0) + nvS;

  if (mondhaVal) {
    extAgg.tot_m = (extAgg.tot_m || 0) + mondhaVal;
  } else if (vM || nvM) {
    extAgg.tot_m = (extAgg.tot_m || 0) + vM + nvM;
  }

  if (sanmaVal) {
    extAgg.tot_s = (extAgg.tot_s || 0) + sanmaVal;
  } else if (vS || nvS) {
    extAgg.tot_s = (extAgg.tot_s || 0) + vS + nvS;
  }

  const area = parseNum(r.area ?? r.total_area ?? r.area_acre ?? r.acres ?? r.acre);
  if (area && !mondhaVal && !sanmaVal && !vM && !vS && !nvM && !nvS) {
    const crop = String(r.crop_stage || r.crop_type || r.type || r.category || '').toLowerCase();
    if (crop.includes('mondha') || crop.includes('ratoon') || crop === 'm') {
      extAgg.tot_m = (extAgg.tot_m || 0) + area;
    } else if (crop.includes('sanma') || crop.includes('plant') || crop === 's') {
      extAgg.tot_s = (extAgg.tot_s || 0) + area;
    } else {
      extAgg.grand_total = (extAgg.grand_total || 0) + area;
    }
  }

  const mp = String(r.master_passbook || '').trim();
  if (mp && mp !== 'null' && mp !== 'undefined') {
    if (!extAgg.uniqueGrowers) {
      extAgg.uniqueGrowers = new Set<string>();
    }
    extAgg.uniqueGrowers.add(mp);
  }
};

// Extract cells for display
function getCustomAggCells(agg: CustomVarietyAgg, isPercentageRow = false): string[] {
  const ext = agg as any;

  const vM = parseNum(ext.v_m ?? ext.vm ?? ext.vM ?? ext.variety_mondha);
  const vS = parseNum(ext.v_s ?? ext.vs ?? ext.vS ?? ext.variety_sanma);
  const nvM = parseNum(ext.nv_m ?? ext.nvm ?? ext.nvM ?? ext.non_variety_mondha);
  const nvS = parseNum(ext.nv_s ?? ext.nvs ?? ext.nvS ?? ext.non_variety_sanma);

  const totalVariety = vM + vS;
  const totalNonVariety = nvM + nvS;

  let totalMondha = parseNum(ext.tot_m ?? ext.totalMondha ?? ext.tm);
  if (!totalMondha && (vM || nvM)) {
    totalMondha = vM + nvM;
  }

  let totalSanma = parseNum(ext.tot_s ?? ext.totalSanma ?? ext.ts);
  if (!totalSanma && (vS || nvS)) {
    totalSanma = vS + nvS;
  }

  let grandTotal = parseNum(ext.grand_total ?? ext.grandTotal ?? ext.gt ?? ext.total);
  if (!grandTotal) {
    grandTotal = totalMondha + totalSanma;
  }

  const totalGrowers = agg.uniqueGrowers ? agg.uniqueGrowers.size : 0;

  const formatNum = (val: number) => {
    if (!val || val === 0) return '0';
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  };

  if (isPercentageRow) {
    const calcPct = (val: number) => {
      if (!grandTotal || grandTotal === 0) return '0%';
      return `${((val / grandTotal) * 100).toFixed(1)}%`;
    };
    return [
      '-',
      calcPct(totalVariety),
      calcPct(totalNonVariety),
      calcPct(totalMondha),
      calcPct(totalSanma),
      calcPct(grandTotal),
    ];
  }

  return [
    String(totalGrowers),
    formatNum(totalVariety),
    formatNum(totalNonVariety),
    formatNum(totalMondha),
    formatNum(totalSanma),
    formatNum(grandTotal),
  ];
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

export default function Report1Screen() {
  const p = usePalette();
  const reportData = useReportData() as any;
  const { rows, zoneNumbers, zoneTypes, circles, mozas, growers = [], loading, error } = reportData;
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [ran, setRan] = useState(false);
  const [tab, setTab] = useState<Tab>('circle');

  const growerMap = useMemo(() => {
    const map = new Map<string, any>();
    growers.forEach((g: any) => {
      if (g.id) map.set(String(g.id), g);
    });
    return map;
  }, [growers]);

  const enrichedRows = useMemo(() => {
    return rows.map((r: any) => {
      const grower = growerMap.get(String(r.grower_id ?? r.grower_code ?? ''));
      const masterPassbook = getMasterPassbook(r, grower);

      return {
        ...r,
        master_passbook: masterPassbook,
      };
    });
  }, [rows, growerMap]);

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

  const filteredRows = useMemo(() => {
    return enrichedRows.filter((r: any) => {
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
  }, [enrichedRows, filters, zoneNumberMap, zoneTypeMap]);

  const circleGroups = useMemo(() => {
    const map = new Map<string, { circleCode: string; circleName: string; zoneName: string; agg: CustomVarietyAgg }>();

    filteredRows.forEach((r: any) => {
      const key = String(r.circle_id || r.circle_code || '__none__');
      if (!map.has(key)) {
        const cObj = circles.find((c: any) => String(c.id) === String(r.circle_id) || String(c.circle_code) === String(r.circle_code));
        const code = String(r.circle_code || (cObj as any)?.circle_code || '');
        const name = r.circle_name || cObj?.circle_name || 'Unknown Circle';

        map.set(key, {
          circleCode: code,
          circleName: name,
          zoneName: r.zone_number ? `Zone ${cleanZone(r.zone_number)} (${r.zone_type || ''})` : '-',
          agg: newAgg() as CustomVarietyAgg,
        });
      }
      addRowCustom(map.get(key)!.agg, r);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.circleCode.localeCompare(b.circleCode, undefined, { numeric: true })
    );
  }, [filteredRows, circles]);

  const mozaByCircle = useMemo(() => {
    const map = new Map<
      string,
      {
        circleCode: string;
        circleName: string;
        zoneName: string;
        mozaMap: Map<string, { mozaCode: string; mozaName: string; agg: CustomVarietyAgg }>;
      }
    >();

    filteredRows.forEach((r: any) => {
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
          agg: newAgg() as CustomVarietyAgg,
        });
      }

      addRowCustom(cGroup.mozaMap.get(mkey)!.agg, r);
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

  const grand = filteredRows.reduce((a: CustomVarietyAgg, r: any) => {
    addRowCustom(a, r);
    return a;
  }, newAgg() as CustomVarietyAgg);

  return (
    <AppShell title="Circle / Moza Wise Summary">
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
                style={[styles.tab, tab === 'circle' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: tab === 'circle' ? p.primary : p.textMuted }}>
                  Circle Wise Summary ({circleGroups.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTab('moza')}
                style={[styles.tab, tab === 'moza' && { borderBottomColor: p.primary, borderBottomWidth: 2 }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: tab === 'moza' ? p.primary : p.textMuted }}>
                  Moza Wise Summary ({totalMozasCount})
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'circle' ? (
              <Card>
                <SectionTitle title="Circle Wise Summary" subtitle={`Displaying ${circleGroups.length} Circles sorted by Circle Code`} />
                {circleGroups.length === 0 ? (
                  <EmptyState message="No data." />
                ) : (
                  <VarietyTable
                    labelHeader="Circle"
                    rows={circleGroups.map((c) => ({ label: c.circleName, agg: c.agg }))}
                    totals={circleGroups.reduce((a, c) => combineCustomAgg(a, c.agg), newAgg() as CustomVarietyAgg)}
                    palette={p}
                    totalLabel={`Total (${circleGroups.length} Circles)`}
                  />
                )}
              </Card>
            ) : (
              <Card>
                <SectionTitle title="Moza Wise Summary" subtitle={`Displaying ${totalMozasCount} Mozas across ${mozaByCircle.length} Circles`} />
                {mozaByCircle.length === 0 ? (
                  <EmptyState message="No data." />
                ) : (
                  mozaByCircle.map((c, i) => {
                    const cTot = c.mozas.reduce((a, m) => combineCustomAgg(a, m.agg), newAgg() as CustomVarietyAgg);
                    return (
                      <View key={i} style={{ marginBottom: 20 }}>
                        <View style={[styles.groupHeader, { borderBottomColor: p.border }]}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: p.primary }}>{c.circleName}</Text>
                          <Text style={{ fontSize: 12, color: p.textMuted, fontWeight: '600' }}>
                            {c.zoneName} • {c.mozas.length} Mozas
                          </Text>
                        </View>
                        <VarietyTable
                          labelHeader="Moza"
                          rows={c.mozas.map((m) => ({ label: m.mozaName, agg: m.agg }))}
                          totals={cTot}
                          palette={p}
                          totalLabel={`Circle Total (${c.mozas.length} Mozas)`}
                        />
                      </View>
                    );
                  })
                )}
                <View style={{ marginTop: 12 }}>
                  <VarietyTable
                    labelHeader=""
                    rows={[]}
                    totals={grand}
                    palette={p}
                    totalLabel={`Grand Total (${mozaByCircle.length} Circles, ${totalMozasCount} Mozas)`}
                    totalsOnly
                    isGrandTotal={true}
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
  isGrandTotal = false,
}: {
  labelHeader: string;
  rows: { label: string; agg: CustomVarietyAgg }[];
  totals: CustomVarietyAgg;
  palette: any;
  totalLabel?: string;
  totalsOnly?: boolean;
  isGrandTotal?: boolean;
}) {
  const cells = getCustomAggCells(totals);
  const percentageCells = getCustomAggCells(totals, true);

  // Auto-detect theme status from palette
  const isDark = Boolean(p?.isDark || p?.mode === 'dark' || (p?.surface && p.surface.toLowerCase().includes('1')));

  // Dark Theme vs Light Theme Colors Matching Screenshots 1 & 2
  const totalBgColor = isDark ? '#061d16' : '#d2ebd9';
  const totalBorderColor = isDark ? '#133d30' : '#b8dfc5';
  const totalTextColor = isDark ? '#10c980' : '#065f46';

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: totalsOnly ? totalBorderColor : p.border,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: p.surface,
      }}
    >
      {!totalsOnly ? (
        <View style={[styles.row, styles.headerRow, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
          <Text style={[styles.cell, { flex: 1.5, color: p.text, fontWeight: '700', fontSize: 13, letterSpacing: 0.3 }]}>
            {labelHeader}
          </Text>
          {CUSTOM_HEADERS.map((h) => {
            const isGrandCol = h === 'Grand Total';
            return (
              <Text
                key={h}
                style={[
                  styles.cell,
                  {
                    flex: 1,
                    color: isGrandCol ? p.primary : p.text,
                    fontWeight: '700',
                    textAlign: 'center',
                    fontSize: 13,
                    letterSpacing: 0.3,
                  },
                ]}
              >
                {h}
              </Text>
            );
          })}
        </View>
      ) : null}

      {!totalsOnly
        ? rows.map((r, i) => {
            const rowCells = getCustomAggCells(r.agg);
            return (
              <View
                key={i}
                style={[
                  styles.row,
                  {
                    borderBottomColor: p.border,
                    backgroundColor: i % 2 === 0 ? p.surface : p.surfaceAlt,
                  },
                ]}
              >
                <Text style={[styles.cell, { flex: 1.5, color: p.text, fontWeight: '600', fontSize: 14 }]}>
                  {r.label}
                </Text>
                {rowCells.map((c, j) => {
                  const isGrandCol = j === CUSTOM_HEADERS.length - 1;
                  return (
                    <Text
                      key={j}
                      style={[
                        styles.cell,
                        {
                          flex: 1,
                          color: isGrandCol ? p.primary : p.text,
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: isGrandCol ? '700' : '500',
                        },
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

      {/* Total / Grand Total Row - Dynamic Light & Dark Theme */}
      <View style={[styles.row, styles.totalRow, { backgroundColor: totalBgColor, borderBottomColor: totalBorderColor }]}>
        <Text style={[styles.cell, { flex: 1.5, color: totalTextColor, fontWeight: '800', fontSize: 14 }]}>
          {totalLabel}
        </Text>
        {cells.map((c, j) => {
          return (
            <Text
              key={j}
              style={[
                styles.cell,
                {
                  flex: 1,
                  color: totalTextColor,
                  fontWeight: '800',
                  textAlign: 'center',
                  fontSize: 14,
                },
              ]}
            >
              {c}
            </Text>
          );
        })}
      </View>

      {/* Percentage Row - Dynamic Light & Dark Theme */}
      <View style={[styles.row, styles.totalRow, { backgroundColor: totalBgColor, borderBottomWidth: 0 }]}>
        <Text style={[styles.cell, { flex: 1.5, color: totalTextColor, fontWeight: '800', fontSize: 13 }]}>
          Percentage (%)
        </Text>
        {percentageCells.map((c, j) => {
          return (
            <Text
              key={j}
              style={[
                styles.cell,
                {
                  flex: 1,
                  color: totalTextColor,
                  fontWeight: '800',
                  textAlign: 'center',
                  fontSize: 13,
                },
              ]}
            >
              {c}
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
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 10 },
  row: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  headerRow: { paddingVertical: 14 },
  totalRow: { paddingVertical: 14 },
  cell: { fontSize: 14 },
});
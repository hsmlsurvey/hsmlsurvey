import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { usePalette } from '@/components/ui';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: number;
  render?: (row: T, index: number) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  footerRow?: React.ReactNode;
  smallHeaders?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  pageSize = 50,
  initialSort,
  footerRow,
  smallHeaders,
}: DataTableProps<T>) {
  const p = usePalette();
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort || null);
  const [page, setPage] = useState(0);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return rows;
    const getVal = (r: T): string | number => {
      if (col.sortValue) return col.sortValue(r);
      const v = r[col.key as keyof T];
      if (typeof v === 'number') return v;
      return v == null ? '' : String(v);
    };
    return [...rows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      let cmp: number;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sortedRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tableScroll}>
        <View style={{ minWidth: '100%' }}>
          {/* Header */}
          <View style={[styles.headerRow, { backgroundColor: p.surfaceAlt, borderBottomColor: p.border }]}>
            {columns.map((c) => {
              const key = String(c.key);
              const active = sort?.key === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => c.sortable !== false && toggleSort(key)}
                  disabled={c.sortable === false}
                  style={[
                    styles.headerCell,
                    { width: c.width },
                    c.align === 'right' ? { alignItems: 'flex-end' } : c.align === 'center' ? { alignItems: 'center' } : null,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      smallHeaders ? styles.headerTextSmall : styles.headerText,
                      { color: p.textMuted },
                      active && { color: p.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {c.label}
                  </Text>
                  {active ? (
                    sort?.dir === 'asc' ? (
                      <ChevronUp size={14} color={p.primary} />
                    ) : (
                      <ChevronDown size={14} color={p.primary} />
                    )
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Body */}
          {pageRows.length === 0 ? (
            <View style={[styles.emptyRow, { borderColor: p.border }]}>
              <Text style={{ color: p.textMuted }}>No records found.</Text>
            </View>
          ) : (
            pageRows.map((row, idx) => {
              const globalIndex = currentPage * pageSize + idx;
              return (
                <View
                  key={idx}
                  style={[styles.bodyRow, { borderBottomColor: p.border, backgroundColor: idx % 2 === 0 ? p.surface : p.surfaceAlt }]}
                >
                  {columns.map((c) => {
                    const key = String(c.key);
                    return (
                      <View
                        key={key}
                        style={[
                          styles.bodyCell,
                          { width: c.width },
                          c.align === 'right' ? { alignItems: 'flex-end' } : c.align === 'center' ? { alignItems: 'center' } : null,
                        ]}
                      >
                        {c.render ? c.render(row, globalIndex) : <Text style={[styles.bodyText, { color: p.text }]}>{String(row[c.key as keyof T] ?? '')}</Text>}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
          {footerRow}
        </View>
      </View>

      {/* Pagination */}
      {sortedRows.length > pageSize ? (
        <View style={[styles.pagination, { borderTopColor: p.border }]}>
          <Text style={{ color: p.textMuted, fontSize: 13 }}>
            {sortedRows.length} records · Page {currentPage + 1} of {totalPages}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              style={[styles.pageBtn, { borderColor: p.border, opacity: currentPage === 0 ? 0.4 : 1 }]}
            >
              <ChevronLeft size={16} color={p.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              style={[styles.pageBtn, { borderColor: p.border, opacity: currentPage >= totalPages - 1 ? 0.4 : 1 }]}
            >
              <ChevronRight size={16} color={p.text} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tableScroll: {
    flexDirection: 'row',
    overflow: 'scroll',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingRight: 8,
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: 0,
    zIndex: 2,
    minWidth: '100%',
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    minWidth: 80,
    flexShrink: 0,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    minWidth: '100%',
  },
  bodyCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    minWidth: 80,
    flexShrink: 0,
  },
  bodyText: {
    fontSize: 13,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
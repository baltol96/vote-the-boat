'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Dot,
} from 'recharts';
import { PieChart, Pie, Cell, Tooltip as PieTooltip } from 'recharts';
import { memberApi, AssetResponse } from '@/lib/api';

const CHART_COLORS = [
  '#0d6e69', '#2b9d97', '#57bfbb', '#8dd7d4',
  '#c4eeec', '#4a9f5e', '#f5a623', '#e05252',
];

function formatManwon(manwon: number): string {
  if (manwon === 0) return '0원';
  const isNeg = manwon < 0;
  const abs = Math.abs(manwon);
  const eok = Math.floor(abs / 10000);
  const rem = abs % 10000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString()}억`);
  if (rem > 0) parts.push(`${rem.toLocaleString()}만`);
  return (isNeg ? '-' : '') + parts.join(' ') + '원';
}

function formatEok(manwon: number): string {
  const eok = manwon / 10000;
  if (eok === 0) return '0';
  return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
}

interface Props {
  monaCd: string;
}

export function AssetTab({ monaCd }: Props) {
  const [allData, setAllData] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    if (!monaCd) return;
    setLoading(true);
    setNoData(false);
    memberApi.getAssetsAll(monaCd)
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.declareYear - b.declareYear);
        setAllData(sorted);
        if (sorted.length > 0) setSelectedYear(sorted[sorted.length - 1].declareYear);
      })
      .catch((err) => {
        if (err?.response?.status === 204 || err?.response?.status === 404) {
          setNoData(true);
        }
      })
      .finally(() => setLoading(false));
  }, [monaCd]);

  const current = allData.find(d => d.declareYear === selectedYear) ?? null;

  const navigateYear = useCallback((dir: -1 | 1) => {
    if (!selectedYear || allData.length === 0) return;
    const idx = allData.findIndex(d => d.declareYear === selectedYear);
    const next = allData[idx + dir];
    if (next) {
      setSelectedYear(next.declareYear);
      setExpandedCat(null);
    }
  }, [selectedYear, allData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }}
        />
      </div>
    );
  }

  if (noData || allData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-2">
        <p className="font-jakarta text-sm text-on-surface/40">재산 데이터가 없습니다</p>
        <p className="font-jakarta text-xs text-on-surface/30">정기재산공개 데이터 준비 중</p>
      </div>
    );
  }

  const chartData = allData.map(d => ({
    year: `'${String(d.declareYear).slice(2)}`,
    fullYear: d.declareYear,
    total: d.totalAmountManwon,
  }));

  const pieData = current?.categories
    .filter(c => !c.name.includes('채무') && c.amountManwon > 0)
    .sort((a, b) => b.amountManwon - a.amountManwon) ?? [];

  const debtCat = current?.categories.find(c => c.name.includes('채무'));
  const selectedIdx = allData.findIndex(d => d.declareYear === selectedYear);
  const canPrev = selectedIdx > 0;
  const canNext = selectedIdx < allData.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {/* ── 위: 재산 변동 추이 ── */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--surface-high)', border: '1px solid rgba(100,135,165,0.15)' }}
      >
        <div>
          <p className="font-manrope text-sm font-bold text-on-surface">재산 변동 추이</p>
          <p className="font-jakarta text-[11px] text-on-surface/40">연도별 재산 변화</p>
        </div>

        {allData.length > 1 ? (
          <>
            <div className="flex items-baseline justify-between">
              <p className="font-jakarta text-sm font-semibold text-on-surface/60">{selectedYear}년</p>
              <p className="font-manrope text-lg font-bold" style={{ color: '#0d6e69' }}>
                {current ? formatManwon(current.totalAmountManwon) : '—'}
              </p>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: 'rgba(var(--on-surface-rgb),0.4)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatEok(v)}
                    tick={{ fontSize: 10, fill: 'rgba(var(--on-surface-rgb),0.4)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatManwon(value), '재산총액']}
                    labelFormatter={(label) => {
                      const d = chartData.find(c => c.year === label);
                      return d ? `${d.fullYear}년` : label;
                    }}
                    contentStyle={{
                      background: 'var(--surface-high)',
                      border: '1px solid rgba(100,135,165,0.2)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#57bfbb"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isSelected = payload.fullYear === selectedYear;
                      return (
                        <Dot
                          key={payload.year}
                          cx={cx} cy={cy} r={isSelected ? 6 : 4}
                          fill={isSelected ? '#0d6e69' : '#57bfbb'}
                          stroke={isSelected ? '#fff' : 'transparent'}
                          strokeWidth={isSelected ? 2 : 0}
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setSelectedYear(payload.fullYear); setExpandedCat(null); }}
                        />
                      );
                    }}
                    activeDot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <Dot
                          cx={cx} cy={cy} r={7}
                          fill="#0d6e69"
                          stroke="#fff"
                          strokeWidth={2}
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setSelectedYear(payload.fullYear); setExpandedCat(null); }}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 py-8 gap-1">
            <p className="font-manrope text-2xl font-bold" style={{ color: '#0d6e69' }}>
              {current ? formatManwon(current.totalAmountManwon) : '—'}
            </p>
            <p className="font-jakarta text-xs text-on-surface/40">{selectedYear}년 공개 기준</p>
          </div>
        )}
      </div>

      {/* ── 아래: 재산 세부 정보 ── */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--surface-high)', border: '1px solid rgba(100,135,165,0.15)' }}
      >
        {/* 헤더 + 연도 네비게이션 */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-manrope text-sm font-bold text-on-surface">재산 세부 정보</p>
            <p className="font-jakarta text-[11px] text-on-surface/40">카테고리별 재산 분포</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateYear(-1)}
              disabled={!canPrev}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: 'rgba(100,135,165,0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="font-jakarta text-xs font-semibold text-on-surface/70 w-14 text-center">
              {selectedYear}년
            </span>
            <button
              onClick={() => navigateYear(1)}
              disabled={!canNext}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: 'rgba(100,135,165,0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {/* 총액 */}
        {current && (
          <div className="flex items-baseline justify-between">
            <p className="font-jakarta text-xs text-on-surface/40">
              {debtCat && debtCat.amountManwon > 0
                ? `채무 ${formatManwon(debtCat.amountManwon)} 포함`
                : '순자산'}
            </p>
            <p className="font-manrope text-lg font-bold" style={{ color: '#0d6e69' }}>
              {formatManwon(current.totalAmountManwon)}
            </p>
          </div>
        )}

        {/* 파이 차트 */}
        {pieData.length > 0 && (
          <div className="flex gap-4 items-center">
            <div className="w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="amountManwon"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={32} outerRadius={58}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip
                    formatter={(value: number, name: string) => [formatManwon(value), name]}
                    contentStyle={{
                      background: 'var(--surface-high)',
                      border: '1px solid rgba(100,135,165,0.2)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {pieData.slice(0, 6).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="font-jakarta text-xs text-on-surface/70 truncate flex-1">{cat.name}</span>
                  <span className="font-jakarta text-xs font-medium text-on-surface/90 shrink-0">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 목록 */}
        {current && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(100,135,165,0.2)' }}
          >
            {current.categories.map((cat, i) => {
              const isDebt = cat.name.includes('채무');
              const colorIdx = pieData.findIndex(p => p.name === cat.name);
              const dotColor = isDebt ? '#e05252' : (CHART_COLORS[colorIdx % CHART_COLORS.length] ?? '#8dd7d4');
              const hasItems = cat.items && cat.items.length > 0;
              const isExpanded = expandedCat === cat.name;

              return (
                <div
                  key={cat.name}
                  style={{ borderTop: i > 0 ? '1px solid rgba(100,135,165,0.12)' : undefined }}
                >
                  <button
                    className="w-full flex items-center px-4 py-3 gap-3 text-left transition-colors"
                    style={{ background: isExpanded ? 'rgba(100,135,165,0.05)' : isDebt ? 'rgba(224,82,82,0.04)' : undefined }}
                    onClick={() => hasItems && setExpandedCat(isExpanded ? null : cat.name)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                    <span className="font-jakarta text-xs text-on-surface/70 flex-1 text-left">{cat.name}</span>
                    {cat.count > 0 && (
                      <span className="font-jakarta text-[10px] text-on-surface/40 shrink-0">{cat.count}건</span>
                    )}
                    <span
                      className="font-jakarta text-xs font-semibold shrink-0"
                      style={{ color: isDebt ? '#e05252' : 'var(--on-surface)' }}
                    >
                      {isDebt ? '-' : ''}{formatManwon(Math.abs(cat.amountManwon))}
                    </span>
                    {hasItems && (
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        className="shrink-0 text-on-surface/30 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </button>

                  {hasItems && isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(100,135,165,0.08)', background: 'rgba(100,135,165,0.03)' }}>
                      {cat.items.map((item, j) => (
                        <div
                          key={j}
                          className="flex items-start px-5 py-2.5 gap-3"
                          style={{ borderTop: j > 0 ? '1px solid rgba(100,135,165,0.08)' : undefined }}
                        >
                          <span
                            className="font-jakarta text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                            style={{ background: `${dotColor}18`, color: dotColor }}
                          >
                            {item.relation}
                          </span>
                          <span className="font-jakarta text-xs text-on-surface/60 flex-1 leading-relaxed">{item.desc || '—'}</span>
                          {item.amountManwon > 0 && (
                            <span className="font-jakarta text-xs font-medium text-on-surface/80 shrink-0">
                              {formatManwon(item.amountManwon)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="font-jakarta text-[10px] text-on-surface/30 text-center">
          출처: 공직자윤리위원회 정기재산공개 ({selectedYear}년)
        </p>
      </div>
    </div>
  );
}

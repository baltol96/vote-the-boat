'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { memberApi, AssetResponse, AssetCategoryResponse } from '@/lib/api';

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

interface Props {
  monaCd: string;
}

export function AssetTab({ monaCd }: Props) {
  const [data, setData] = useState<AssetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    if (!monaCd) return;
    setLoading(true);
    setNoData(false);
    memberApi.getAssets(monaCd)
      .then(setData)
      .catch((err) => {
        if (err?.response?.status === 204 || err?.response?.status === 404) {
          setNoData(true);
        }
      })
      .finally(() => setLoading(false));
  }, [monaCd]);

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

  if (noData || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-2">
        <p className="font-jakarta text-sm text-on-surface/40">재산 데이터가 없습니다</p>
        <p className="font-jakarta text-xs text-on-surface/30">2026년 정기재산공개 데이터 준비 중</p>
      </div>
    );
  }

  const gross = data.categories
    .filter(c => !c.name.includes('채무'))
    .reduce((s, c) => s + c.amountManwon, 0);

  const pieData = data.categories
    .filter(c => !c.name.includes('채무') && c.amountManwon > 0)
    .sort((a, b) => b.amountManwon - a.amountManwon);

  const debtCat = data.categories.find(c => c.name.includes('채무'));

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더: 연도 + 총액 */}
      <div className="flex flex-col gap-1">
        <p className="font-jakarta text-[11px] font-semibold text-on-surface/40 uppercase tracking-widest">
          {data.declareYear}년 재산공개
        </p>
        <p className="font-manrope text-2xl font-bold text-on-surface">
          {formatManwon(data.totalAmountManwon)}
        </p>
        {debtCat && debtCat.amountManwon > 0 && (
          <p className="font-jakarta text-xs text-on-surface/50">
            채무 {formatManwon(debtCat.amountManwon)} 포함
          </p>
        )}
      </div>

      {/* 파이 차트 */}
      {pieData.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-jakarta text-[11px] font-semibold text-on-surface/40 uppercase tracking-widest">
            분야별 비중
          </p>
          <div className="flex gap-4 items-center">
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="amountManwon"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={64}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
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

            {/* 범례 */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {pieData.slice(0, 6).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="font-jakarta text-xs text-on-surface/70 truncate flex-1">{cat.name}</span>
                  <span className="font-jakarta text-xs font-medium text-on-surface/90 shrink-0">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 상세 목록 */}
      <div className="flex flex-col gap-2">
        <p className="font-jakarta text-[11px] font-semibold text-on-surface/40 uppercase tracking-widest">
          항목별 내역
        </p>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(100,135,165,0.2)' }}
        >
          {data.categories.map((cat, i) => {
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
                {/* 카테고리 헤더 */}
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

                {/* 개별 항목 */}
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
      </div>

      <p className="font-jakarta text-[10px] text-on-surface/30 text-center">
        출처: 공직자윤리위원회 정기재산공개 ({data.declareYear}년)
      </p>
    </div>
  );
}

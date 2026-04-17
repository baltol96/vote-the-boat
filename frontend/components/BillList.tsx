'use client';

import { useState } from 'react';
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import type { BillResponse, PageResponse } from '@/lib/api';

const SEP = '1px solid rgba(100,135,165,0.25)';

const BILL_STATUS_LABEL: Record<string, string> = {
  PROPOSED:  '발의',
  COMMITTEE: '위원회 심사',
  PASSED:    '가결',
  REJECTED:  '부결',
  WITHDRAWN: '철회',
  EXPIRED:   '임기만료',
};

const BILL_STATUS_COLOR: Record<string, string> = {
  PROPOSED:  '#60a5fa',
  COMMITTEE: '#fbbf24',
  PASSED:    '#34d399',
  REJECTED:  '#f87171',
  WITHDRAWN: '#94a3b8',
  EXPIRED:   '#fb923c',
};

interface BillListProps {
  bills: PageResponse<BillResponse> | null;
}

export function BillList({ bills }: BillListProps) {
  const [billFilter, setBillFilter]   = useState<string | null>(null);
  const [billRoleTab, setBillRoleTab] = useState<'all' | 'main' | 'co'>('all');

  if (!bills || bills.content.length === 0) {
    return <p className="font-jakarta text-xs text-on-surface/40">발의 법안이 없습니다.</p>;
  }

  const mainCount = bills.content.filter(b => b.proposerRole === '대표발의').length;
  const coCount   = bills.content.filter(b => b.proposerRole === '공동발의').length;

  const filteredByRole = bills.content.filter((b) =>
    billRoleTab === 'all'
      ? true
      : billRoleTab === 'main'
        ? b.proposerRole === '대표발의'
        : b.proposerRole === '공동발의',
  );

  const counts: Record<string, number> = {};
  for (const bill of filteredByRole) {
    counts[bill.status] = (counts[bill.status] ?? 0) + 1;
  }
  const chartData = Object.entries(counts).map(([status, count]) => ({
    name:   BILL_STATUS_LABEL[status] ?? status,
    value:  count,
    color:  BILL_STATUS_COLOR[status] ?? '#94a3b8',
    status,
  }));

  return (
    <div className="flex flex-col gap-3">
      {/* 대표발의 / 공동발의 탭 */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: SEP }}>
        {(['all', 'main', 'co'] as const).map((role) => {
          const label =
            role === 'all'  ? `전체 ${bills.content.length}` :
            role === 'main' ? `대표발의 ${mainCount}` :
                              `공동발의 ${coCount}`;
          const isActive = billRoleTab === role;
          return (
            <button
              key={role}
              onClick={() => { setBillRoleTab(role); setBillFilter(null); }}
              className="flex-1 py-2 font-jakarta text-xs font-medium transition-all"
              style={{
                background:  isActive ? 'rgba(13,110,105,0.1)' : 'var(--color-surface-high)',
                color:       isActive ? '#0d6e69' : 'rgba(26,37,53,0.45)',
                borderRight: role !== 'co' ? SEP : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 발의 현황 그래프 */}
      <div
        className="rounded-xl p-4 mb-1"
        style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}
      >
        <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">
          총 {filteredByRole.length}건 발의 현황
        </p>
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius="55%" outerRadius="80%"
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [`${v}건`, name]}
                  contentStyle={{
                    background: 'var(--color-surface-high)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#1a2535',
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {chartData.map((entry) => {
              const isActive = billFilter === entry.status;
              return (
                <button
                  key={entry.status}
                  onClick={() => setBillFilter(isActive ? null : entry.status)}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition-all text-left"
                  style={{
                    background: isActive ? `${entry.color}20` : 'transparent',
                    outline:    isActive ? `1px solid ${entry.color}55` : '1px solid transparent',
                  }}
                >
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full transition-transform"
                    style={{ backgroundColor: entry.color, transform: isActive ? 'scale(1.25)' : 'scale(1)' }}
                  />
                  <span
                    className="font-jakarta text-xs truncate"
                    style={{ color: isActive ? entry.color : 'rgba(26,37,53,0.85)' }}
                  >
                    {entry.name}
                  </span>
                  <span
                    className="ml-auto font-manrope text-xs font-semibold shrink-0"
                    style={{ color: entry.color }}
                  >
                    {entry.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 법안 목록 */}
      {bills.content
        .filter((bill) => billFilter === null || bill.status === billFilter)
        .filter((bill) =>
          billRoleTab === 'all'
            ? true
            : billRoleTab === 'main'
              ? bill.proposerRole === '대표발의'
              : bill.proposerRole === '공동발의',
        )
        .map((bill) => (
          <div key={bill.billNo} className="rounded-xl p-4 bg-surface-high" style={{ border: SEP }}>
            <p className="font-jakarta text-xs font-medium text-on-surface/90 line-clamp-2 leading-relaxed">
              {bill.billName}
            </p>
            <div className="flex gap-2 mt-2 items-center min-w-0">
              <span className="font-jakarta text-xs text-on-surface/40 shrink-0">{bill.proposeDt}</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-jakarta font-medium shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: `${BILL_STATUS_COLOR[bill.status] ?? '#94a3b8'}22`,
                  color:           BILL_STATUS_COLOR[bill.status] ?? '#94a3b8',
                }}
              >
                {BILL_STATUS_LABEL[bill.status] ?? bill.status}
              </span>
              {bill.committee && (
                <span className="font-jakarta text-xs text-on-surface/40 truncate min-w-0">
                  {bill.committee}
                </span>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { memberApi } from '@/lib/api';
import type { AttendanceSummaryResponse } from '@/lib/api';
import { RateGaugeChart } from './RateGaugeChart';

const SEP = '1px solid rgba(100,135,165,0.25)';

const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  PRESENT:       '출석',
  ABSENT:        '결석',
  LEAVE:         '청가',
  OFFICIAL_TRIP: '출장',
};

const ATTENDANCE_STATUS_COLOR: Record<string, string> = {
  PRESENT:       '#34d399',
  ABSENT:        '#f87171',
  LEAVE:         '#fbbf24',
  OFFICIAL_TRIP: '#60a5fa',
};

// ── 본회의 출결 뷰 ────────────────────────────────────────────────────────────

function PlenaryAttendanceView({ plenary }: { plenary: AttendanceSummaryResponse['plenary'] }) {
  const plenaryStats = [
    { key: 'PRESENT',       count: plenary.presentCount },
    { key: 'ABSENT',        count: plenary.absentCount },
    { key: 'LEAVE',         count: plenary.leaveCount },
    { key: 'OFFICIAL_TRIP', count: plenary.officialTripCount },
  ].filter(s => s.count > 0);

  const plenaryRate = plenary.totalCount > 0
    ? Math.round(plenary.presentCount / plenary.totalCount * 1000) / 10
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 출석률 요약 */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)' }}
      >
        <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">본회의 출석률</p>
        {plenary.totalCount === 0 ? (
          <p className="font-jakarta text-xs text-on-surface/40">본회의 출결 데이터가 없습니다.</p>
        ) : (
          <RateGaugeChart
            rate={plenaryRate}
            attended={plenary.presentCount}
            total={plenary.totalCount}
            unit="회"
            activeLabel="출석"
          />
        )}
      </div>

      {/* 출결 상태별 통계 */}
      {plenary.totalCount > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}
        >
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">
            총 {plenary.totalCount.toLocaleString()}회 본회의 현황
          </p>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plenaryStats.map(s => ({
                      name:  ATTENDANCE_STATUS_LABEL[s.key],
                      value: s.count,
                      color: ATTENDANCE_STATUS_COLOR[s.key],
                    }))}
                    cx="50%" cy="50%"
                    innerRadius="55%" outerRadius="80%"
                    dataKey="value"
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {plenaryStats.map(s => (
                      <Cell key={s.key} fill={ATTENDANCE_STATUS_COLOR[s.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v}회`, name]}
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
              {plenaryStats.map(s => (
                <div key={s.key} className="flex items-center gap-2 px-1.5 py-0.5">
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: ATTENDANCE_STATUS_COLOR[s.key] }}
                  />
                  <span className="font-jakarta text-xs" style={{ color: 'rgba(26,37,53,0.85)' }}>
                    {ATTENDANCE_STATUS_LABEL[s.key]}
                  </span>
                  <span
                    className="ml-auto font-manrope text-xs font-semibold shrink-0"
                    style={{ color: ATTENDANCE_STATUS_COLOR[s.key] }}
                  >
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 회기별 출결 목록 */}
      {plenary.recentRecords.length > 0 && (() => {
        const grouped = plenary.recentRecords.reduce<Record<number, typeof plenary.recentRecords>>(
          (acc, r) => { (acc[r.sessionNo] ??= []).push(r); return acc; },
          {},
        );
        const sessions = Object.keys(grouped).map(Number).sort((a, b) => b - a);
        return (
          <div className="rounded-xl p-4 bg-surface-high" style={{ border: SEP }}>
            <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">최근 본회의 출결</p>
            <div className="flex flex-col gap-3">
              {sessions.map((sessionNo) => (
                <div key={sessionNo}>
                  <p className="font-jakarta text-[10px] font-semibold text-on-surface/40 mb-1.5 tracking-wide">
                    {sessionNo}회
                  </p>
                  <div className="flex flex-col gap-1">
                    {grouped[sessionNo]
                      .slice()
                      .sort((a, b) => a.meetingNo - b.meetingNo)
                      .map((r, i) => {
                        const color = ATTENDANCE_STATUS_COLOR[r.status] ?? '#94a3b8';
                        return (
                          <div key={i} className="flex items-center gap-2 pl-2">
                            <span className="font-jakarta text-xs text-on-surface/50 shrink-0 w-28">
                              {r.meetingNo}차 {r.meetingDt}
                            </span>
                            <span
                              className="font-jakarta text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ background: `${color}22`, color }}
                            >
                              {ATTENDANCE_STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── 위원회 카드 ───────────────────────────────────────────────────────────────

function CommitteeCard({ c }: { c: AttendanceSummaryResponse['committees'][number] }) {
  const [open, setOpen] = useState(false);

  const rate = c.totalCount > 0 ? Math.round(c.presentCount / c.totalCount * 1000) / 10 : 0;
  const grouped = (c.recentRecords ?? []).reduce<Record<number, typeof c.recentRecords>>(
    (acc, r) => { (acc[r.sessionNo] ??= []).push(r); return acc; },
    {},
  );
  const sessions    = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const hasRecords  = sessions.length > 0;

  return (
    <div className="rounded-xl overflow-hidden bg-surface-high" style={{ border: SEP }}>
      <button
        className="w-full text-left p-3"
        onClick={() => hasRecords && setOpen(o => !o)}
        style={{ cursor: hasRecords ? 'pointer' : 'default' }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-jakarta text-xs font-medium text-on-surface/80 leading-snug">
            {c.committeeName}
          </p>
          {hasRecords && (
            <span
              className="shrink-0 mt-0.5 text-on-surface/30 transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex-1">
            <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(13,110,105,0.12)' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${rate}%`, background: '#0d6e69' }}
              />
            </div>
          </div>
          <span className="font-manrope text-xs font-semibold text-primary shrink-0 w-12 text-right">
            {rate.toFixed(1)}%
          </span>
        </div>
        <div className="flex gap-3">
          {[
            { key: 'PRESENT',       count: c.presentCount },
            { key: 'ABSENT',        count: c.absentCount },
            { key: 'LEAVE',         count: c.leaveCount },
            { key: 'OFFICIAL_TRIP', count: c.officialTripCount },
          ].filter(s => s.count > 0).map(s => (
            <span key={s.key} className="font-jakarta text-xs" style={{ color: ATTENDANCE_STATUS_COLOR[s.key] }}>
              {ATTENDANCE_STATUS_LABEL[s.key]} {s.count}
            </span>
          ))}
        </div>
      </button>

      {open && hasRecords && (
        <div
          className="flex flex-col gap-2 px-3 pb-3 pt-2"
          style={{ borderTop: '1px solid rgba(100,135,165,0.2)' }}
        >
          {sessions.map((sessionNo) => (
            <div key={sessionNo}>
              <p className="font-jakarta text-[10px] font-semibold text-on-surface/40 mb-1 tracking-wide">
                {sessionNo}회
              </p>
              <div className="flex flex-col gap-0.5">
                {grouped[sessionNo]
                  .slice()
                  .sort((a, b) => a.meetingNo - b.meetingNo)
                  .map((r, i) => {
                    const color = ATTENDANCE_STATUS_COLOR[r.status] ?? '#94a3b8';
                    return (
                      <div key={i} className="flex items-center gap-2 pl-2">
                        <span className="font-jakarta text-xs text-on-surface/50 shrink-0 w-28">
                          {r.meetingNo}차 {r.meetingDt}
                        </span>
                        <span
                          className="font-jakarta text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: `${color}22`, color }}
                        >
                          {ATTENDANCE_STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 위원회 출결 뷰 ────────────────────────────────────────────────────────────

function CommitteeAttendanceView({ committees }: { committees: AttendanceSummaryResponse['committees'] }) {
  if (committees.length === 0) {
    return <p className="font-jakarta text-xs text-on-surface/40">위원회 출결 데이터가 없습니다.</p>;
  }

  const standing = committees.filter(c => !c.committeeName.includes('특별위'));
  const special  = committees.filter(c =>  c.committeeName.includes('특별위'));

  return (
    <div className="flex flex-col gap-2">
      {standing.map(c => <CommitteeCard key={c.committeeName} c={c} />)}

      {standing.length > 0 && special.length > 0 && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px" style={{ background: 'rgba(100,135,165,0.3)' }} />
          <span className="font-jakarta text-[10px] font-semibold text-on-surface/35 shrink-0">특별위원회</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(100,135,165,0.3)' }} />
        </div>
      )}

      {special.map(c => <CommitteeCard key={c.committeeName} c={c} />)}
    </div>
  );
}

// ── 출결현황 탭 (public export) ───────────────────────────────────────────────

interface AttendanceTabProps {
  monaCd: string;
}

export function AttendanceTab({ monaCd }: AttendanceTabProps) {
  const [data, setData]     = useState<AttendanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [subTab, setSubTab] = useState<'plenary' | 'committee'>('plenary');

  useEffect(() => {
    setLoading(true);
    memberApi.getAttendanceSummary(monaCd)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [monaCd]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }} />
      </div>
    );
  }

  if (error || !data) {
    return <p className="font-jakarta text-xs text-on-surface/40">출결 데이터가 없습니다.</p>;
  }

  const { plenary, committees } = data;

  return (
    <div className="flex flex-col gap-3">
      {/* 서브탭 */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: SEP }}>
        {([
          { key: 'plenary',   label: '본회의' },
          { key: 'committee', label: '상임위·특위' },
        ] as const).map(({ key, label }, idx) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className="flex-1 py-2 font-jakarta text-xs font-medium transition-all"
            style={{
              background:  subTab === key ? 'rgba(13,110,105,0.1)' : 'var(--color-surface-high)',
              color:       subTab === key ? '#0d6e69' : 'rgba(26,37,53,0.45)',
              borderRight: idx === 0 ? SEP : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'plenary'   && <PlenaryAttendanceView plenary={plenary} />}
      {subTab === 'committee' && <CommitteeAttendanceView committees={committees} />}
    </div>
  );
}

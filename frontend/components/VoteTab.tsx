'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { memberApi } from '@/lib/api';
import type { VoteResponse, AttendanceResponse } from '@/lib/api';
import { RateGaugeChart } from './RateGaugeChart';

const SEP = '1px solid rgba(100,135,165,0.25)';

const VOTE_RESULT_LABEL: Record<string, string> = {
  YES:     '찬성',
  NO:      '반대',
  ABSTAIN: '기권',
  ABSENT:  '불참',
};

const VOTE_RESULT_COLOR: Record<string, string> = {
  YES:     '#34d399',
  NO:      '#f87171',
  ABSTAIN: '#fbbf24',
  ABSENT:  '#94a3b8',
};

interface VoteTabProps {
  monaCd: string;
  attendanceSummary: AttendanceResponse | null;
}

export function VoteTab({ monaCd, attendanceSummary }: VoteTabProps) {
  const [votes, setVotes]             = useState<VoteResponse[]>([]);
  const [page, setPage]               = useState(0);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultFilter, setResultFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setVotes([]);
    setPage(0);
    memberApi.getVotes(monaCd, 0, 30, resultFilter)
      .then(data => {
        setVotes(data.content);
        setHasMore(!data.last);
        setPage(0);
      })
      .finally(() => setLoading(false));
  }, [monaCd, resultFilter]);

  const loadMore = () => {
    setLoadingMore(true);
    memberApi.getVotes(monaCd, page + 1, 30, resultFilter)
      .then(data => {
        setVotes(prev => [...prev, ...data.content]);
        setHasMore(!data.last);
        setPage(p => p + 1);
      })
      .finally(() => setLoadingMore(false));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }} />
      </div>
    );
  }

  const summaryData = attendanceSummary
    ? [
        { key: 'YES',     label: '찬성', count: attendanceSummary.yesCount },
        { key: 'NO',      label: '반대', count: attendanceSummary.noCount },
        { key: 'ABSTAIN', label: '기권', count: attendanceSummary.abstainCount },
        { key: 'ABSENT',  label: '불참', count: attendanceSummary.absentCount },
      ].filter(d => d.count > 0)
    : [];

  const chartData = summaryData.map(d => ({
    name:  d.label,
    value: d.count,
    color: VOTE_RESULT_COLOR[d.key],
    key:   d.key,
  }));

  const filterOptions = [
    { key: null,      label: '전체',  count: attendanceSummary ? attendanceSummary.totalVotes : votes.length },
    { key: 'YES',     label: '찬성',  count: attendanceSummary?.yesCount ?? 0 },
    { key: 'NO',      label: '반대',  count: attendanceSummary?.noCount ?? 0 },
    { key: 'ABSTAIN', label: '기권',  count: attendanceSummary?.abstainCount ?? 0 },
    { key: 'ABSENT',  label: '불참',  count: attendanceSummary?.absentCount ?? 0 },
  ].filter(o => o.key === null || o.count > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* 결과 필터 버튼 */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: SEP }}>
        {filterOptions.map((opt, idx) => {
          const isActive = resultFilter === opt.key;
          const color    = opt.key ? VOTE_RESULT_COLOR[opt.key] : '#0d6e69';
          return (
            <button
              key={String(opt.key)}
              onClick={() => setResultFilter(opt.key)}
              className="flex-1 py-2 font-jakarta text-xs font-medium transition-all"
              style={{
                background:  isActive ? `${color}18` : 'var(--color-surface-high)',
                color:       isActive ? color : 'rgba(26,37,53,0.45)',
                borderRight: idx < filterOptions.length - 1 ? SEP : 'none',
              }}
            >
              {opt.label}{opt.count > 0 && <span className="opacity-70"> {opt.count}</span>}
            </button>
          );
        })}
      </div>

      {/* 표결 참여율 게이지 */}
      {attendanceSummary && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)' }}
        >
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-1">표결 참여율</p>
          <RateGaugeChart
            rate={attendanceSummary.attendanceRate}
            attended={attendanceSummary.attendedVotes}
            total={attendanceSummary.totalVotes}
            unit="건"
            activeLabel="참여율"
          />
        </div>
      )}

      {/* 표결 현황 도넛 차트 */}
      {attendanceSummary && attendanceSummary.totalVotes > 0 && (
        <div
          className="rounded-xl p-4 mb-1"
          style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}
        >
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">
            총 {attendanceSummary.totalVotes.toLocaleString()}건 표결 현황
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
                      <Cell key={entry.key} fill={entry.color} />
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
              {summaryData.map((d) => {
                const color    = VOTE_RESULT_COLOR[d.key];
                const isActive = resultFilter === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setResultFilter(isActive ? null : d.key)}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition-all text-left"
                    style={{
                      background: isActive ? `${color}20` : 'transparent',
                      outline:    isActive ? `1px solid ${color}55` : '1px solid transparent',
                    }}
                  >
                    <span
                      className="shrink-0 w-2.5 h-2.5 rounded-full transition-transform"
                      style={{ backgroundColor: color, transform: isActive ? 'scale(1.25)' : 'scale(1)' }}
                    />
                    <span
                      className="font-jakarta text-xs truncate"
                      style={{ color: isActive ? color : 'rgba(26,37,53,0.85)' }}
                    >
                      {d.label}
                    </span>
                    <span className="ml-auto font-manrope text-xs font-semibold shrink-0" style={{ color }}>
                      {d.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 표결 목록 */}
      {votes.length === 0 && (
        <p className="font-jakarta text-xs text-on-surface/40">표결 데이터가 없습니다.</p>
      )}
      {votes.map((vote) => {
        const color = VOTE_RESULT_COLOR[vote.result] ?? '#94a3b8';
        return (
          <div
            key={`${vote.billNo}-${vote.voteDt}`}
            className="rounded-xl p-4 bg-surface-high"
            style={{ border: '1px solid rgba(100,135,165,0.25)' }}
          >
            {vote.billUrl ? (
              <a
                href={vote.billUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-jakarta text-xs font-medium text-on-surface/90 line-clamp-2 leading-relaxed hover:underline decoration-on-surface/30"
              >
                {vote.billName}
              </a>
            ) : (
              <p className="font-jakarta text-xs font-medium text-on-surface/90 line-clamp-2 leading-relaxed">
                {vote.billName}
              </p>
            )}
            <div className="flex gap-2 mt-2 items-center min-w-0">
              <span className="font-jakarta text-xs text-on-surface/40 shrink-0">{vote.voteDt}</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-jakarta font-medium shrink-0"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {VOTE_RESULT_LABEL[vote.result] ?? vote.result}
              </span>
              {vote.currCommittee && (
                <span className="font-jakarta text-xs text-on-surface/40 truncate min-w-0">
                  {vote.currCommittee}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && !resultFilter && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2.5 rounded-xl font-jakarta text-xs font-medium transition-all"
          style={{
            background: 'rgba(13,110,105,0.06)',
            border:     '1px solid rgba(13,110,105,0.15)',
            color:      '#0d6e69',
          }}
        >
          {loadingMore ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}

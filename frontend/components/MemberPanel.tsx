'use client';

import React, { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { memberApi, districtApi, MemberResponse, BillResponse, VoteResponse, AttendanceResponse, PageResponse, HistoricalRepresentativeResponse } from '@/lib/api';
import { PARTY_COLORS, PARTY_COLOR_FALLBACK, getPartyColor } from '@/lib/constants';
import clsx from 'clsx';

interface MemberPanelProps {
  monaCd: string;
  sggCode?: string;
  onClose?: () => void;
}

const VOTE_RESULT_LABEL: Record<string, string> = {
  YES: '찬성',
  NO: '반대',
  ABSTAIN: '기권',
  ABSENT: '불참',
};

const BILL_STATUS_LABEL: Record<string, string> = {
  PROPOSED: '발의',
  COMMITTEE: '위원회 심사',
  PASSED: '가결',
  REJECTED: '부결',
  WITHDRAWN: '철회',
  EXPIRED: '임기만료',
};

const BILL_STATUS_COLOR: Record<string, string> = {
  PROPOSED:  '#60a5fa',
  COMMITTEE: '#fbbf24',
  PASSED:    '#34d399',
  REJECTED:  '#f87171',
  WITHDRAWN: '#94a3b8',
  EXPIRED:   '#fb923c',
};

const SEP = '1px solid rgba(100,135,165,0.25)';

function getPartyBadgeStyle(party?: string): React.CSSProperties {
  if (!party) return { backgroundColor: `${PARTY_COLOR_FALLBACK}26`, color: PARTY_COLOR_FALLBACK };
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.includes(key)) return { backgroundColor: `${color}26`, color };
  }
  return { backgroundColor: `${PARTY_COLOR_FALLBACK}26`, color: PARTY_COLOR_FALLBACK };
}

export default function MemberPanel({ monaCd, sggCode, onClose }: MemberPanelProps) {
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [bills, setBills] = useState<PageResponse<BillResponse> | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'bills' | 'votes' | 'history'>('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billFilter, setBillFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      memberApi.getMember(monaCd),
      memberApi.getAttendance(monaCd),
      memberApi.getBills(monaCd, 0, 200),
    ])
      .then(([memberRes, attendanceRes, billsRes]) => {
        if (memberRes.status === 'rejected') {
          setError('의원 정보를 불러오지 못했습니다.');
          return;
        }
        setMember(memberRes.value);
        if (attendanceRes.status === 'fulfilled') setAttendance(attendanceRes.value);
        if (billsRes.status === 'fulfilled') setBills(billsRes.value);
      })
      .finally(() => setLoading(false));
  }, [monaCd]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-low">
        <div className="w-7 h-7 rounded-full border-2 animate-spin"
             style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }} />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 bg-surface-low">
        <p className="text-sm font-jakarta text-red-500">{error ?? '데이터 없음'}</p>
        {onClose && (
          <button onClick={onClose} className="text-xs text-on-surface/40 hover:text-on-surface/70 transition-colors">
            닫기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-low overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: SEP }}>
        <span className="font-manrope text-sm font-semibold text-on-surface/60">{member.district}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface/40 hover:text-on-surface hover:bg-surface-high/60 transition-all text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* 프로필 */}
      <div className="flex items-center gap-5 px-6 py-5" style={{ borderBottom: SEP }}>
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-14 h-18 object-cover rounded-xl"
            style={{ border: '1px solid rgba(100,135,165,0.3)' }}
          />
        ) : (
          <div className="w-14 h-18 rounded-xl flex items-center justify-center text-on-surface/30 text-xs font-jakarta bg-surface-high">
            사진없음
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="font-manrope text-2xl font-bold text-on-surface">{member.name}</span>
          <span className="text-xs px-3 py-1 rounded-full w-fit font-jakarta font-medium" style={getPartyBadgeStyle(member.party)}>
            {member.party}
          </span>
          <span className="font-jakarta text-xs text-on-surface/50">
            {member.electionType} · {member.termCount}선
          </span>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex px-6 pt-4 gap-1">
        {(['info', 'bills', 'votes', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-xs font-jakarta font-medium transition-all duration-300',
              activeTab === tab
                ? 'bg-primary-container/80 text-primary'
                : 'text-on-surface/40 hover:text-on-surface/70',
            )}
          >
            {tab === 'info' ? '기본정보' : tab === 'bills' ? '법안발의' : tab === 'votes' ? '표결현황' : '역대의원'}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'info' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              {[
                { label: '이메일', value: member.email },
                { label: '전화', value: member.phone },
                { label: '사무실', value: member.officeRoom },
                { label: '성별', value: member.gender },
                { label: '생년월일', value: member.birthDate },
                { label: '이름(한자)', value: member.nameHan },
                { label: '본관', value: member.bon },
                { label: '출생지', value: member.posi },
              ]
                .filter(({ value }) => value)
                .map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="font-jakarta text-xs text-on-surface/40 w-16 shrink-0 pt-0.5">{label}</span>
                    <span className="font-jakarta text-xs text-on-surface/80 break-all">{value}</span>
                  </div>
                ))}
            </div>

            {[
              { label: '학력·경력', value: member.hak },
              { label: '종교·취미', value: member.hobby },
              { label: '저서', value: member.book },
              { label: '상훈', value: member.sang },
              { label: '기타', value: member.dead },
            ]
              .filter(({ value }) => value)
              .map(({ label, value }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: '#dde4ee', border: SEP }}>
                  <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-2">{label}</p>
                  <p className="font-jakarta text-xs text-on-surface/80 leading-relaxed whitespace-pre-line">{value}</p>
                </div>
              ))}

            {member.heritageUrl && (
              <a
                href={member.heritageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-jakarta text-xs font-medium transition-all"
                style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)', color: '#0d6e69' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                헌정회 홈페이지
              </a>
            )}
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="flex flex-col gap-3">
            {bills && bills.content.length > 0 && (() => {
              const counts: Record<string, number> = {};
              for (const bill of bills.content) {
                counts[bill.status] = (counts[bill.status] ?? 0) + 1;
              }
              const chartData = Object.entries(counts).map(([status, count]) => ({
                name: BILL_STATUS_LABEL[status] ?? status,
                value: count,
                color: BILL_STATUS_COLOR[status] ?? '#94a3b8',
                status,
              }));
              return (
                <div className="rounded-xl p-4 mb-1"
                     style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}>
                  <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">
                    총 {bills.content.length}건 발의 현황
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
                            contentStyle={{ background: '#dde4ee', border: 'none', borderRadius: 8, color: '#1a2535', fontSize: 11 }}
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
                              outline: isActive ? `1px solid ${entry.color}55` : '1px solid transparent',
                            }}
                          >
                            <span className="shrink-0 w-2.5 h-2.5 rounded-full transition-transform" style={{ backgroundColor: entry.color, transform: isActive ? 'scale(1.25)' : 'scale(1)' }} />
                            <span className="font-jakarta text-xs truncate" style={{ color: isActive ? entry.color : 'rgba(26,37,53,0.85)' }}>{entry.name}</span>
                            <span className="ml-auto font-manrope text-xs font-semibold shrink-0" style={{ color: entry.color }}>{entry.value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {bills?.content.length === 0 && (
              <p className="font-jakarta text-xs text-on-surface/40">발의 법안이 없습니다.</p>
            )}
            {bills?.content
              .filter((bill) => billFilter === null || bill.status === billFilter)
              .map((bill) => (
              <div key={bill.billNo} className="rounded-xl p-4" style={{ background: '#dde4ee', border: SEP }}>
                <p className="font-jakarta text-xs font-medium text-on-surface/90 line-clamp-2 leading-relaxed">
                  {bill.billName}
                </p>
                <div className="flex gap-2 mt-2 items-center min-w-0">
                  <span className="font-jakarta text-xs text-on-surface/40 shrink-0">{bill.proposeDt}</span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-jakarta font-medium shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: `${BILL_STATUS_COLOR[bill.status] ?? '#94a3b8'}22`,
                      color: BILL_STATUS_COLOR[bill.status] ?? '#94a3b8',
                    }}
                  >
                    {BILL_STATUS_LABEL[bill.status] ?? bill.status}
                  </span>
                  {bill.committee && (
                    <span className="font-jakarta text-xs text-on-surface/40 truncate min-w-0">{bill.committee}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'votes' && <VoteTab monaCd={monaCd} attendanceSummary={attendance} />}
        {activeTab === 'history' && <HistoryTab sggCode={sggCode} />}
      </div>
    </div>
  );
}

const VOTE_RESULT_COLOR: Record<string, string> = {
  YES:     '#34d399',
  NO:      '#f87171',
  ABSTAIN: '#fbbf24',
  ABSENT:  '#94a3b8',
};

function VoteTab({ monaCd, attendanceSummary }: { monaCd: string; attendanceSummary: AttendanceResponse | null }) {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultFilter, setResultFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    memberApi.getVotes(monaCd, 0, 30)
      .then(data => {
        setVotes(data.content);
        setHasMore(!data.last);
        setPage(0);
      })
      .finally(() => setLoading(false));
  }, [monaCd]);

  const loadMore = () => {
    setLoadingMore(true);
    memberApi.getVotes(monaCd, page + 1, 30)
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
    name: d.label,
    value: d.count,
    color: VOTE_RESULT_COLOR[d.key],
    key: d.key,
  }));

  const filtered = resultFilter ? votes.filter(v => v.result === resultFilter) : votes;

  return (
    <div className="flex flex-col gap-3">
      {attendanceSummary && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)' }}>
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-1">표결 참여율</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="100%"
                innerRadius="60%" outerRadius="80%"
                barSize={10}
                startAngle={180} endAngle={0}
                data={[{ name: '참여율', value: attendanceSummary.attendanceRate, fill: '#0d6e69' }]}
              >
                <RadialBar dataKey="value" background={{ fill: 'rgba(13,110,105,0.08)' }} cornerRadius={4} isAnimationActive={true} animationBegin={0} animationDuration={900} animationEasing="ease-out" />
                <Tooltip
                  formatter={(v) => [`${v}%`, '참여율']}
                  contentStyle={{ background: '#dde4ee', border: 'none', borderRadius: 8, color: '#1a2535', fontSize: 12 }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center font-manrope text-3xl font-bold text-primary">
            {attendanceSummary.attendanceRate.toFixed(1)}%
          </div>
          <div className="text-center font-jakarta text-xs text-on-surface/40 mt-1">
            {attendanceSummary.attendedVotes.toLocaleString()} / {attendanceSummary.totalVotes.toLocaleString()} 건
          </div>
        </div>
      )}

      {attendanceSummary && attendanceSummary.totalVotes > 0 && (
        <div className="rounded-xl p-4 mb-1"
             style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}>
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">
            총 {attendanceSummary.totalVotes.toLocaleString()}건 표결 현황
          </p>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" dataKey="value" strokeWidth={0} isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out">
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v}건`, name]}
                    contentStyle={{ background: '#dde4ee', border: 'none', borderRadius: 8, color: '#1a2535', fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {summaryData.map((d) => {
                const color = VOTE_RESULT_COLOR[d.key];
                const isActive = resultFilter === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setResultFilter(isActive ? null : d.key)}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition-all text-left"
                    style={{
                      background: isActive ? `${color}20` : 'transparent',
                      outline: isActive ? `1px solid ${color}55` : '1px solid transparent',
                    }}
                  >
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full transition-transform"
                          style={{ backgroundColor: color, transform: isActive ? 'scale(1.25)' : 'scale(1)' }} />
                    <span className="font-jakarta text-xs truncate"
                          style={{ color: isActive ? color : 'rgba(26,37,53,0.85)' }}>
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

      {filtered.length === 0 && (
        <p className="font-jakarta text-xs text-on-surface/40">표결 데이터가 없습니다.</p>
      )}
      {filtered.map((vote) => {
        const color = VOTE_RESULT_COLOR[vote.result] ?? '#94a3b8';
        return (
          <div key={`${vote.billNo}-${vote.voteDt}`} className="rounded-xl p-4"
               style={{ background: '#dde4ee', border: '1px solid rgba(100,135,165,0.25)' }}>
            {vote.billUrl ? (
              <a href={vote.billUrl} target="_blank" rel="noopener noreferrer"
                 className="font-jakarta text-xs font-medium text-on-surface/90 line-clamp-2 leading-relaxed hover:underline decoration-on-surface/30">
                {vote.billName}
              </a>
            ) : (
              <p className="font-jakarta text-xs font-medium text-on-surface/90 line-clamp-2 leading-relaxed">
                {vote.billName}
              </p>
            )}
            <div className="flex gap-2 mt-2 items-center min-w-0">
              <span className="font-jakarta text-xs text-on-surface/40 shrink-0">{vote.voteDt}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-jakarta font-medium shrink-0"
                    style={{ backgroundColor: `${color}22`, color }}>
                {VOTE_RESULT_LABEL[vote.result] ?? vote.result}
              </span>
              {vote.currCommittee && (
                <span className="font-jakarta text-xs text-on-surface/40 truncate min-w-0">{vote.currCommittee}</span>
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
          style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)', color: '#0d6e69' }}
        >
          {loadingMore ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}

function HistoryTab({ sggCode }: { sggCode?: string }) {
  const [history, setHistory] = useState<HistoricalRepresentativeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sggCode) { setLoading(false); return; }
    districtApi.getHistory(sggCode)
      .then(data => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [sggCode]);

  if (!sggCode) {
    return (
      <p className="font-jakarta text-xs text-on-surface/40 py-2">
        지역구를 클릭하면 역대 의원 현황을 확인할 수 있습니다.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }} />
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="font-jakarta text-xs text-on-surface/40 py-2">역대 의원 데이터가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {history.map((rep) => {
        const partyColor = getPartyColor(rep.party);
        return (
          <div
            key={`${rep.termNumber}-${rep.monaCd}`}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: '#dde4ee', border: '1px solid rgba(100,135,165,0.25)' }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-manrope font-bold text-xs"
              style={{ background: `${partyColor}22`, color: partyColor, border: `1px solid ${partyColor}44` }}
            >
              {rep.termNumber}대
            </div>
            {rep.photoUrl ? (
              <img src={rep.photoUrl} alt={rep.name}
                   className="w-8 h-10 object-cover rounded-lg shrink-0"
                   style={{ border: '1px solid rgba(100,135,165,0.3)' }} />
            ) : (
              <div className="w-8 h-10 rounded-lg shrink-0 flex items-center justify-center font-manrope text-xs font-bold"
                   style={{ background: 'var(--color-surface-high)', color: 'var(--color-primary)' }}>
                {rep.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-manrope text-sm font-bold text-on-surface">{rep.name}</span>
                {rep.nameHan && (
                  <span className="font-jakarta text-xs text-on-surface/40">({rep.nameHan})</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-jakarta font-medium"
                  style={{ background: `${partyColor}22`, color: partyColor }}
                >
                  {rep.party}
                </span>
                {rep.electionType && (
                  <span className="font-jakarta text-xs text-on-surface/40">{rep.electionType}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

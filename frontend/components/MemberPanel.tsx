'use client';

import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { memberApi, districtApi, MemberResponse, BillResponse, VoteResponse, AttendanceResponse, AttendanceSummaryResponse, PageResponse, HistoricalRepresentativeResponse } from '@/lib/api';
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
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'bills' | 'votes' | 'history'>('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billFilter, setBillFilter] = useState<string | null>(null);
  const [billRoleTab, setBillRoleTab] = useState<'all' | 'main' | 'co'>('all');

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
      <div className="flex justify-center px-4 pt-4 gap-0.5">
        {(['info', 'attendance', 'bills', 'votes', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-jakarta font-medium transition-all duration-300 whitespace-nowrap',
              activeTab === tab
                ? 'bg-primary-container/80 text-primary'
                : 'text-on-surface/40 hover:text-on-surface/70',
            )}
          >
            {tab === 'info' ? '기본정보' : tab === 'attendance' ? '출결현황' : tab === 'bills' ? '법안발의' : tab === 'votes' ? '표결현황' : '역대의원'}
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
              const mainCount = bills.content.filter(b => b.proposerRole === '대표발의').length;
              const coCount = bills.content.filter(b => b.proposerRole === '공동발의').length;

              const filteredByRole = bills.content.filter((b) =>
                billRoleTab === 'all' || (billRoleTab === 'main' ? b.proposerRole === '대표발의' : b.proposerRole === '공동발의')
              );

              const counts: Record<string, number> = {};
              for (const bill of filteredByRole) {
                counts[bill.status] = (counts[bill.status] ?? 0) + 1;
              }
              const chartData = Object.entries(counts).map(([status, count]) => ({
                name: BILL_STATUS_LABEL[status] ?? status,
                value: count,
                color: BILL_STATUS_COLOR[status] ?? '#94a3b8',
                status,
              }));

              return (
                <>
                  {/* 대표발의 / 공동발의 탭 */}
                  <div className="flex rounded-xl overflow-hidden" style={{ border: SEP }}>
                    {(['all', 'main', 'co'] as const).map((role) => {
                      const label = role === 'all' ? `전체 ${bills.content.length}` : role === 'main' ? `대표발의 ${mainCount}` : `공동발의 ${coCount}`;
                      const isActive = billRoleTab === role;
                      return (
                        <button
                          key={role}
                          onClick={() => { setBillRoleTab(role); setBillFilter(null); }}
                          className="flex-1 py-2 font-jakarta text-xs font-medium transition-all"
                          style={{
                            background: isActive ? 'rgba(13,110,105,0.1)' : '#dde4ee',
                            color: isActive ? '#0d6e69' : 'rgba(26,37,53,0.45)',
                            borderRight: role !== 'co' ? SEP : 'none',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* 발의 현황 그래프 */}
                  <div className="rounded-xl p-4 mb-1"
                       style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}>
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
                </>
              );
            })()}

            {bills?.content.length === 0 && (
              <p className="font-jakarta text-xs text-on-surface/40">발의 법안이 없습니다.</p>
            )}
            {bills?.content
              .filter((bill) => billFilter === null || bill.status === billFilter)
              .filter((bill) => billRoleTab === 'all' || (billRoleTab === 'main' ? bill.proposerRole === '대표발의' : bill.proposerRole === '공동발의'))
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

        {activeTab === 'attendance' && <AttendanceTab monaCd={monaCd} />}
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
    name: d.label,
    value: d.count,
    color: VOTE_RESULT_COLOR[d.key],
    key: d.key,
  }));

  const filterOptions = [
    { key: null,      label: '전체',  count: attendanceSummary ? attendanceSummary.totalVotes : votes.length },
    { key: 'YES',     label: '찬성',  count: attendanceSummary?.yesCount ?? 0 },
    { key: 'NO',      label: '반대',  count: attendanceSummary?.noCount ?? 0 },
    { key: 'ABSTAIN', label: '기권',  count: attendanceSummary?.abstainCount ?? 0 },
    { key: 'ABSENT',  label: '불참',  count: attendanceSummary?.absentCount ?? 0 },
  ].filter(o => o.key === null || o.count > 0);

  const filtered = votes;

  return (
    <div className="flex flex-col gap-3">
      {/* 결과 필터 버튼 */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: SEP }}>
        {filterOptions.map((opt, idx) => {
          const isActive = resultFilter === opt.key;
          const color = opt.key ? VOTE_RESULT_COLOR[opt.key] : '#0d6e69';
          return (
            <button
              key={String(opt.key)}
              onClick={() => setResultFilter(opt.key)}
              className="flex-1 py-2 font-jakarta text-xs font-medium transition-all"
              style={{
                background: isActive ? `${color}18` : '#dde4ee',
                color: isActive ? color : 'rgba(26,37,53,0.45)',
                borderRight: idx < filterOptions.length - 1 ? SEP : 'none',
              }}
            >
              {opt.label} {opt.count > 0 && <span className="opacity-70">{opt.count}</span>}
            </button>
          );
        })}
      </div>

      {attendanceSummary && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)' }}>
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-1">표결 참여율</p>
          <div className="flex flex-col items-center -mb-2">
            <div className="w-full" style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: '참여율', value: attendanceSummary.attendanceRate },
                      { name: '미참여', value: 100 - attendanceSummary.attendanceRate },
                    ]}
                    cx="50%" cy="100%"
                    startAngle={180} endAngle={0}
                    innerRadius="70%" outerRadius="100%"
                    dataKey="value"
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    <Cell fill="#0d6e69" />
                    <Cell fill="rgba(13,110,105,0.1)" />
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => name === '참여율' ? [`${v.toFixed(1)}%`, name] : null as any}
                    contentStyle={{ background: '#dde4ee', border: 'none', borderRadius: 8, color: '#1a2535', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="font-manrope text-3xl font-bold text-primary leading-none">
              {attendanceSummary.attendanceRate.toFixed(1)}%
            </div>
            <div className="font-jakarta text-xs text-on-surface/40 mt-1">
              {attendanceSummary.attendedVotes.toLocaleString()} / {attendanceSummary.totalVotes.toLocaleString()} 건
            </div>
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

// ─── 출결현황 탭 ────────────────────────────────────────────────────────────────

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

function AttendanceTab({ monaCd }: { monaCd: string }) {
  const [data, setData] = useState<AttendanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

      {/* 본회의 출결 요약 */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(13,110,105,0.06)', border: '1px solid rgba(13,110,105,0.15)' }}>
        <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">본회의 출석률</p>

        {plenary.totalCount === 0 ? (
          <p className="font-jakarta text-xs text-on-surface/40">본회의 출결 데이터가 없습니다.</p>
        ) : (
          <>
            <div className="flex flex-col items-center -mb-2">
              <div className="w-full" style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '출석', value: plenaryRate },
                        { name: '미출석', value: 100 - plenaryRate },
                      ]}
                      cx="50%" cy="100%"
                      startAngle={180} endAngle={0}
                      innerRadius="70%" outerRadius="100%"
                      dataKey="value"
                      strokeWidth={0}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      <Cell fill="#0d6e69" />
                      <Cell fill="rgba(13,110,105,0.1)" />
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => name === '출석' ? [`${v.toFixed(1)}%`, name] : null as any}
                      contentStyle={{ background: '#dde4ee', border: 'none', borderRadius: 8, color: '#1a2535', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="font-manrope text-3xl font-bold text-primary leading-none">
                {plenaryRate.toFixed(1)}%
              </div>
              <div className="font-jakarta text-xs text-on-surface/40 mt-1">
                {plenary.presentCount.toLocaleString()} / {plenary.totalCount.toLocaleString()} 회
              </div>
            </div>
          </>
        )}
      </div>

      {/* 본회의 출결 통계 */}
      {plenary.totalCount > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(13,110,105,0.05)', border: '1px solid rgba(13,110,105,0.13)' }}>
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">
            총 {plenary.totalCount.toLocaleString()}회 본회의 현황
          </p>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plenaryStats.map(s => ({ name: ATTENDANCE_STATUS_LABEL[s.key], value: s.count, color: ATTENDANCE_STATUS_COLOR[s.key] }))}
                    cx="50%" cy="50%" innerRadius="55%" outerRadius="80%"
                    dataKey="value" strokeWidth={0}
                    isAnimationActive={true} animationBegin={0} animationDuration={700} animationEasing="ease-out"
                  >
                    {plenaryStats.map(s => <Cell key={s.key} fill={ATTENDANCE_STATUS_COLOR[s.key]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v}회`, name]}
                    contentStyle={{ background: '#dde4ee', border: 'none', borderRadius: 8, color: '#1a2535', fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {plenaryStats.map(s => (
                <div key={s.key} className="flex items-center gap-2 px-1.5 py-0.5">
                  <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ATTENDANCE_STATUS_COLOR[s.key] }} />
                  <span className="font-jakarta text-xs" style={{ color: 'rgba(26,37,53,0.85)' }}>
                    {ATTENDANCE_STATUS_LABEL[s.key]}
                  </span>
                  <span className="ml-auto font-manrope text-xs font-semibold shrink-0" style={{ color: ATTENDANCE_STATUS_COLOR[s.key] }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 최근 본회의 출결 목록 */}
      {plenary.recentRecords.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: '#dde4ee', border: SEP }}>
          <p className="font-jakarta text-xs font-medium text-on-surface/50 mb-3">최근 본회의 출결</p>
          <div className="flex flex-col gap-1.5">
            {plenary.recentRecords.map((r, i) => {
              const color = ATTENDANCE_STATUS_COLOR[r.status] ?? '#94a3b8';
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-jakarta text-xs text-on-surface/50 w-24 shrink-0">
                    {r.meetingDt} ({r.sessionNo}회{r.meetingNo}차)
                  </span>
                  <span className="font-jakarta text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${color}22`, color }}>
                    {ATTENDANCE_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 위원회 출결 */}
      {committees.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-jakarta text-xs font-medium text-on-surface/50">위원회 출결</p>
          {committees.map((c) => {
            const rate = c.totalCount > 0 ? Math.round(c.presentCount / c.totalCount * 1000) / 10 : 0;
            return (
              <div key={c.committeeName} className="rounded-xl p-3"
                   style={{ background: '#dde4ee', border: SEP }}>
                <p className="font-jakarta text-xs font-medium text-on-surface/80 mb-2 truncate">{c.committeeName}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(13,110,105,0.12)' }}>
                      <div className="h-1.5 rounded-full transition-all"
                           style={{ width: `${rate}%`, background: '#0d6e69' }} />
                    </div>
                  </div>
                  <span className="font-manrope text-xs font-semibold text-primary shrink-0 w-12 text-right">
                    {rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex gap-3 mt-1.5">
                  {[
                    { key: 'PRESENT', count: c.presentCount },
                    { key: 'ABSENT', count: c.absentCount },
                    { key: 'LEAVE', count: c.leaveCount },
                    { key: 'OFFICIAL_TRIP', count: c.officialTripCount },
                  ].filter(s => s.count > 0).map(s => (
                    <span key={s.key} className="font-jakarta text-xs"
                          style={{ color: ATTENDANCE_STATUS_COLOR[s.key] }}>
                      {ATTENDANCE_STATUS_LABEL[s.key]} {s.count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

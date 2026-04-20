'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import clsx from 'clsx';
import { memberApi, MemberResponse, AttendanceResponse, BillResponse, PageResponse } from '@/lib/api';
import { PARTY_COLORS, PARTY_COLOR_FALLBACK } from '@/lib/constants';

function getPartyBadgeStyle(party?: string): React.CSSProperties {
  if (!party) return { backgroundColor: `${PARTY_COLOR_FALLBACK}26`, color: PARTY_COLOR_FALLBACK };
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.includes(key)) return { backgroundColor: `${color}26`, color };
  }
  return { backgroundColor: `${PARTY_COLOR_FALLBACK}26`, color: PARTY_COLOR_FALLBACK };
}
import { MemberProfile }  from '@/components/MemberProfile';
import { BillList }       from '@/components/BillList';
import { VoteTab }        from '@/components/VoteTab';
import { AttendanceTab }  from '@/components/AttendanceTab';
import { BillInsight }    from '@/components/BillInsight';
import { AssetTab }       from '@/components/AssetTab';


const SEP = '1px solid rgba(100,135,165,0.25)';

type TabKey = 'info' | 'attendance' | 'bills' | 'votes' | 'assets';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info',       label: '기본정보' },
  { key: 'attendance', label: '출결현황' },
  { key: 'bills',      label: '법안발의' },
  { key: 'votes',      label: '표결현황' },
  { key: 'assets',     label: '재산정보' },
];

// ── 기본정보 탭 ───────────────────────────────────────────────────────────────

function InfoTab({ member }: { member: MemberResponse }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {[
          { label: '이메일',     value: member.email },
          { label: '전화',       value: member.phone },
          { label: '사무실',     value: member.officeRoom },
          { label: '성별',       value: member.gender },
          { label: '생년월일',   value: member.birthDate },
          { label: '이름(한자)', value: member.nameHan },
          { label: '본관',       value: member.bon },
          { label: '출생지',     value: member.posi },
        ]
          .filter(({ value }) => value)
          .map(({ label, value }) => (
            <div key={label} className="flex gap-3">
              <span className="font-jakarta text-xs text-on-surface/40 w-20 shrink-0 pt-0.5">{label}</span>
              <span className="font-jakarta text-xs text-on-surface/80 break-all">{value}</span>
            </div>
          ))}
      </div>

      {[
        { label: '학력·경력', value: member.hak },
        { label: '종교·취미', value: member.hobby },
        { label: '저서',      value: member.book },
        { label: '상훈',      value: member.sang },
        { label: '기타',      value: member.dead },
      ]
        .filter(({ value }) => value)
        .map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 bg-surface-high" style={{ border: SEP }}>
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
          style={{
            background: 'rgba(13,110,105,0.06)',
            border:     '1px solid rgba(13,110,105,0.15)',
            color:      '#0d6e69',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          헌정회 홈페이지
        </a>
      )}
    </div>
  );
}

// ── 상세 페이지 ───────────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const router   = useRouter();
  const monaCode = router.query.monaCode as string | undefined;

  const [member,        setMember]        = useState<MemberResponse | null>(null);
  const [attendance,    setAttendance]    = useState<AttendanceResponse | null>(null);
  const [bills,         setBills]         = useState<PageResponse<BillResponse> | null>(null);
  const [activeTab,     setActiveTab]     = useState<TabKey>('info');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [showNameInNav, setShowNameInNav] = useState(false);
  const tabSentinelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowNameInNav(!entry.isIntersecting),
      { rootMargin: '-53px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    if (!monaCode) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      memberApi.getMember(monaCode),
      memberApi.getAttendance(monaCode),
      memberApi.getBills(monaCode, 0, 200),
    ]).then(([memberRes, attendanceRes, billsRes]) => {
      if (memberRes.status === 'rejected') {
        setError('의원 정보를 불러오지 못했습니다.');
        return;
      }
      setMember(memberRes.value);
      if (attendanceRes.status === 'fulfilled') setAttendance(attendanceRes.value);
      if (billsRes.status === 'fulfilled') setBills(billsRes.value);
    }).finally(() => setLoading(false));
  }, [monaCode]);

  function handleShare() {
    const url  = window.location.href;
    const text = member ? `${member.name} 의원 (${member.party}, ${member.district}) 의정활동 확인` : '';
    if (navigator.share) {
      navigator.share({ title: text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('링크가 복사되었습니다.');
      }).catch(() => {});
    }
  }

  const title = member ? `${member.name} (${member.party}) - 의정활동` : '의원 정보';

  return (
    <>
      <Head>
        <title>{title}</title>
        {member && (
          <meta
            name="description"
            content={`${member.district} ${member.name} 의원의 법안 발의, 표결, 출결 현황`}
          />
        )}
      </Head>

      <div className="min-h-screen bg-surface-low">
        {/* 상단 내비게이션 */}
        <nav
          className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-surface-low"
          style={{ borderBottom: SEP }}
        >
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-full text-on-surface/50 hover:text-on-surface hover:bg-surface-high/70 transition-all shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-manrope text-sm font-semibold text-on-surface/60 truncate shrink-0">
            {member?.district ?? '\u00A0'}
          </span>
          <span className="flex items-center justify-center gap-2 flex-1 min-w-0">
            <span
              className="font-manrope text-sm font-semibold text-on-surface truncate transition-opacity duration-200"
              style={{ opacity: showNameInNav ? 1 : 0 }}
            >
              {member?.name}
            </span>
            {member && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-jakarta font-medium shrink-0 transition-opacity duration-200"
                style={{ ...getPartyBadgeStyle(member.party), opacity: showNameInNav ? 1 : 0 }}
              >
                {member.party}
              </span>
            )}
          </span>
          {member && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-jakarta text-xs font-medium transition-all shrink-0"
              style={{
                background: 'rgba(13,110,105,0.08)',
                border:     '1px solid rgba(13,110,105,0.18)',
                color:      '#0d6e69',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              공유
            </button>
          )}
        </nav>

        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }}
              />
            </div>
          ) : error || !member ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 px-6">
              <p className="font-jakarta text-sm text-red-500 text-center">{error ?? '데이터 없음'}</p>
              <button
                onClick={() => router.back()}
                className="font-jakarta text-xs text-on-surface/50 hover:text-on-surface/80 transition-colors"
              >
                돌아가기
              </button>
            </div>
          ) : (
            <>
              {/* 프로필 */}
              <MemberProfile member={member} />

              {/* 탭 sticky 감지용 sentinel */}
              <div ref={tabSentinelRef} />

              {/* 탭 네비게이션 */}
              <div
                className="flex justify-center px-4 pt-4 pb-2 gap-0.5 sticky top-[53px] z-10 bg-surface-low"
                style={{ borderBottom: SEP }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-jakarta font-medium transition-all duration-300 whitespace-nowrap',
                      activeTab === tab.key
                        ? 'bg-primary-container/80 text-primary'
                        : 'text-on-surface/40 hover:text-on-surface/70',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 탭 콘텐츠 */}
              <div className="px-6 py-5">
                {activeTab === 'info'       && <InfoTab member={member} />}
                {activeTab === 'attendance' && <AttendanceTab monaCd={monaCode!} />}
                {activeTab === 'bills'      && (
                  <div className="flex flex-col gap-6">
                    <section>
                      <p className="font-jakarta text-[11px] font-semibold text-on-surface/40 uppercase tracking-widest mb-3">법안 인사이트</p>
                      <BillInsight monaCd={monaCode!} />
                    </section>
                    <div style={{ borderTop: SEP }} />
                    <section>
                      <p className="font-jakarta text-[11px] font-semibold text-on-surface/40 uppercase tracking-widest mb-3">발의 법안 목록</p>
                      <BillList bills={bills} />
                    </section>
                  </div>
                )}
                {activeTab === 'votes'      && (
                  <div className="flex flex-col gap-6">
                    <section>
                      <VoteTab monaCd={monaCode!} attendanceSummary={attendance} />
                    </section>
                  </div>
                )}
                {activeTab === 'assets'    && <AssetTab monaCd={monaCode!} />}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

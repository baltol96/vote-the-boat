'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { memberApi, MemberResponse, AttendanceResponse, BillResponse, PageResponse } from '@/lib/api';
import clsx from 'clsx';
import { MemberProfile } from './MemberProfile';
import { BillList }      from './BillList';
import { VoteTab }       from './VoteTab';
import { AttendanceTab } from './AttendanceTab';
import { HistoryTab }    from './HistoryTab';

const SEP = '1px solid rgba(100,135,165,0.25)';

interface MemberPanelProps {
  monaCd: string;
  sggCode?: string;
  onClose?: () => void;
}

export default function MemberPanel({ monaCd, sggCode, onClose }: MemberPanelProps) {
  const [member,     setMember]     = useState<MemberResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [bills,      setBills]      = useState<PageResponse<BillResponse> | null>(null);
  const [activeTab,  setActiveTab]  = useState<'info' | 'attendance' | 'bills' | 'votes' | 'history'>('info');
  const [loading,    setLoading]    = useState(true);
  const [billsLoading, setBillsLoading] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMember(null);
    setBills(null);
    setAttendance(null);
    setActiveTab('info');

    // getMember 먼저 → 즉시 렌더 (사진 포함)
    memberApi.getMember(monaCd)
      .then(m => {
        setMember(m);
        setLoading(false);
      })
      .catch(() => {
        setError('의원 정보를 불러오지 못했습니다.');
        setLoading(false);
      });

    // 나머지는 백그라운드에서 — 렌더를 블록하지 않음
    memberApi.getAttendance(monaCd)
      .then(setAttendance)
      .catch(() => {});
  }, [monaCd]);

  // 법안 탭 진입 시 lazy fetch
  useEffect(() => {
    if (activeTab !== 'bills' || bills !== null || billsLoading) return;
    setBillsLoading(true);
    memberApi.getBills(monaCd, 0, 200)
      .then(setBills)
      .catch(() => {})
      .finally(() => setBillsLoading(false));
  }, [activeTab, monaCd, bills, billsLoading]);

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
          <button
            onClick={onClose}
            className="text-xs text-on-surface/40 hover:text-on-surface/70 transition-colors"
          >
            닫기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-low overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: SEP }}>
        <span className="font-manrope text-sm font-semibold text-on-surface/60 flex-1 truncate">{member.district}</span>
        <Link
          href={`/members/${member.monaCd}`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full font-jakarta text-xs font-medium transition-all shrink-0"
          style={{
            background: 'rgba(13,110,105,0.08)',
            border:     '1px solid rgba(13,110,105,0.18)',
            color:      '#0d6e69',
          }}
        >
          상세 보기
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface/40 hover:text-on-surface hover:bg-surface-high/60 transition-all text-sm shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* 프로필 */}
      <MemberProfile member={member} />

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
            {tab === 'info'       ? '기본정보' :
             tab === 'attendance' ? '출결현황' :
             tab === 'bills'      ? '법안발의' :
             tab === 'votes'      ? '표결현황' :
                                    '역대의원'}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'info' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              {[
                { label: '이메일',    value: member.email },
                { label: '전화',      value: member.phone },
                { label: '사무실',    value: member.officeRoom },
                { label: '성별',      value: member.gender },
                { label: '생년월일',  value: member.birthDate },
                { label: '이름(한자)', value: member.nameHan },
                { label: '본관',      value: member.bon },
                { label: '출생지',    value: member.posi },
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
        )}

        {activeTab === 'bills'      && (
          billsLoading
            ? <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                     style={{ borderColor: 'rgba(13,110,105,0.15)', borderTopColor: '#0d6e69' }} />
              </div>
            : <BillList bills={bills} />
        )}
        {activeTab === 'attendance' && <AttendanceTab monaCd={monaCd} />}
        {activeTab === 'votes'      && <VoteTab       monaCd={monaCd} attendanceSummary={attendance} />}
        {activeTab === 'history'    && <HistoryTab    sggCode={sggCode} />}
      </div>
    </div>
  );
}

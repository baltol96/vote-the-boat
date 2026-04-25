'use client';

import { useEffect, useState } from 'react';
import { GovernorDetailResponse, governorApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

const formatBirthday = (raw?: string) => {
  if (!raw) return undefined;
  const s = raw.replace(/\D/g, '');
  if (s.length !== 8) return raw;
  return `${s.slice(0, 4)}년 ${parseInt(s.slice(4, 6))}월 ${parseInt(s.slice(6, 8))}일`;
};

interface GovernorPanelProps {
  huboid: string;
  onClose?: () => void;
}

const SEP = '1px solid rgba(100,135,165,0.25)';

export default function GovernorPanel({ huboid, onClose }: GovernorPanelProps) {
  const [governor, setGovernor] = useState<GovernorDetailResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setGovernor(null);

    governorApi.getGovernorDetail(huboid)
      .then(g => { setGovernor(g); setLoading(false); })
      .catch(() => { setError('정보를 불러오지 못했습니다.'); setLoading(false); });
  }, [huboid]);

  const partyColor = governor ? getPartyColor(governor.party) : '#4a5568';

  return (
    <div className="flex flex-col h-full font-jakarta overflow-hidden"
         style={{ background: 'var(--color-panel-bg, #f4f7fb)', color: 'var(--color-text, #1a2332)' }}>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
           style={{ borderBottom: SEP }}>
        <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#8fa3b8' }}>지자체장</span>
        {onClose && (
          <button onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: '#8fa3b8' }}
                  aria-label="닫기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 rounded-full border-2 animate-spin"
                 style={{ borderColor: 'rgba(43,181,174,0.15)', borderTopColor: 'var(--color-primary, #2bb5ae)' }} />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm" style={{ color: '#ff8a80' }}>{error}</p>
          </div>
        )}

        {governor && (
          <>
            {/* 프로필 */}
            <div className="px-5 py-5" style={{ borderBottom: SEP }}>
              <div className="flex items-start gap-4">
                {/* 정당 색 아바타 */}
                <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-lg font-bold"
                     style={{ background: partyColor }}>
                  {governor.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-tight">{governor.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: partyColor, fontWeight: 600 }}>
                    {governor.party ?? '무소속'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#8fa3b8' }}>
                    {governor.sdName}
                    {governor.sggName && ` · ${governor.sggName}`}
                  </p>
                </div>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="px-5 py-4" style={{ borderBottom: SEP }}>
              <p className="text-xs font-semibold mb-3 uppercase tracking-widest"
                 style={{ color: '#8fa3b8' }}>기본 정보</p>
              <dl className="space-y-2">
                {[
                  { label: '생년월일', value: formatBirthday(governor.birthday) },
                  { label: '성별',    value: governor.gender },
                  { label: '직업',    value: governor.job },
                  { label: '학력',    value: governor.edu },
                  { label: '주요경력', value: governor.career1 },
                  { label: '주요경력2', value: governor.career2 },
                  { label: '주소',    value: governor.addr },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex gap-3 text-sm">
                    <dt className="w-20 flex-shrink-0 text-xs" style={{ color: '#8fa3b8', paddingTop: 1 }}>{label}</dt>
                    <dd className="flex-1 break-words leading-relaxed">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 선거 공약 */}
            {governor.pledges.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold mb-3 uppercase tracking-widest"
                   style={{ color: '#8fa3b8' }}>선거 공약</p>
                <ol className="space-y-3">
                  {governor.pledges.map(p => (
                    <li key={p.order}
                        className="rounded-xl p-3.5"
                        style={{ background: 'rgba(43,181,174,0.06)', border: '1px solid rgba(43,181,174,0.15)' }}>
                      <div className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                              style={{ background: partyColor, fontSize: 10 }}>
                          {p.order}
                        </span>
                        <div className="min-w-0">
                          {p.realmName && (
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded mb-1"
                                  style={{ background: 'rgba(43,181,174,0.12)', color: '#2bb5ae', fontWeight: 600 }}>
                              {p.realmName}
                            </span>
                          )}
                          <p className="text-sm font-semibold leading-snug">{p.title}</p>
                          {p.content && (
                            <p className="text-xs mt-1.5 leading-relaxed whitespace-pre-wrap"
                               style={{ color: '#6b8090' }}>{p.content}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {governor.pledges.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: '#8fa3b8' }}>등록된 공약 정보가 없습니다.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

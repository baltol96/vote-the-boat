'use client';

import { useEffect, useState } from 'react';
import { GovernorResponse, governorApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

interface DistrictGovernorListProps {
  sdName: string;
  onSelect: (huboid: string) => void;
  onBack: () => void;
}

const SEP = '1px solid rgba(100,135,165,0.15)';

export default function DistrictGovernorList({ sdName, onSelect, onBack }: DistrictGovernorListProps) {
  const [governors, setGovernors] = useState<GovernorResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    governorApi.getDistrictGovernors(sdName)
      .then(data => {
        setGovernors(data.slice().sort((a, b) => (a.sggName ?? '').localeCompare(b.sggName ?? '', 'ko')));
        setLoading(false);
      })
      .catch(() => {
        setError('정보를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, [sdName]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-panel-bg, #f4f7fb)' }}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
           style={{ borderBottom: SEP, background: 'var(--color-panel-bg, #f4f7fb)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-primary, #2bb5ae)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          시도 선택
        </button>
        <span style={{ color: 'rgba(100,135,165,0.4)' }}>|</span>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text, #1a2332)' }}>{sdName}</span>
        {!loading && (
          <span className="ml-auto text-xs" style={{ color: '#8fa3b8' }}>
            {governors.length}명
          </span>
        )}
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
                 style={{ borderColor: 'rgba(43,181,174,0.15)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#ff8a80' }}>{error}</p>
          </div>
        )}
        {!loading && !error && governors.map((gov, i) => {
          const partyColor = getPartyColor(gov.party);
          return (
            <button
              key={gov.huboid}
              onClick={() => onSelect(gov.huboid)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
              style={{
                borderBottom: i < governors.length - 1 ? SEP : 'none',
                background: 'transparent',
              }}>
              {/* 정당 색 인디케이터 */}
              <div className="w-1 self-stretch rounded-full flex-shrink-0"
                   style={{ background: partyColor, minHeight: 36 }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold truncate"
                        style={{ color: 'var(--color-text, #1a2332)' }}>
                    {gov.name}
                  </span>
                  <span className="text-xs flex-shrink-0"
                        style={{ color: partyColor }}>
                    {gov.party}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8fa3b8' }}>
                  {gov.sggName}
                </div>
              </div>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" className="flex-shrink-0"
                   style={{ color: 'rgba(100,135,165,0.5)' }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { GovernorResponse, governorApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

interface GovernorSplitPanelProps {
  sdName: string;
  onGovernorSelect: (huboid: string) => void;
  onClose: () => void;
}

const SEP = '1px solid rgba(100,135,165,0.15)';

export default function GovernorSplitPanel({ sdName, onGovernorSelect, onClose }: GovernorSplitPanelProps) {
  const [metroGov, setMetroGov]     = useState<GovernorResponse | null>(null);
  const [districts, setDistricts]   = useState<GovernorResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      governorApi.getMetroMayors(),
      governorApi.getDistrictGovernors(sdName),
    ]).then(([metros, dists]) => {
      setMetroGov(metros.find(g => g.sdName === sdName) ?? null);
      setDistricts(dists.slice().sort((a, b) => (a.sggName ?? '').localeCompare(b.sggName ?? '', 'ko')));
      setLoading(false);
    }).catch(() => {
      setError('정보를 불러오지 못했습니다.');
      setLoading(false);
    });
  }, [sdName]);

  const metroColor = getPartyColor(metroGov?.party);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-panel-bg, #f4f7fb)', color: 'var(--color-text, #1a2332)' }}>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{ borderBottom: SEP }}>
        <span className="text-sm font-bold">{sdName}</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ color: '#8fa3b8' }}
          aria-label="닫기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
               style={{ borderColor: 'rgba(43,181,174,0.15)', borderTopColor: 'var(--color-primary, #2bb5ae)' }} />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm" style={{ color: '#ff8a80' }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* 시도지사 카드 */}
          {metroGov ? (
            <button
              onClick={() => onGovernorSelect(metroGov.huboid)}
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0 w-full text-left transition-opacity hover:opacity-80"
              style={{ borderBottom: SEP }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                   style={{ background: metroColor }}>
                {metroGov.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold">{metroGov.name}</span>
                  <span className="text-xs" style={{ color: metroColor }}>{metroGov.party ?? '무소속'}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8fa3b8' }}>시도지사</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" style={{ color: 'rgba(100,135,165,0.5)', flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ) : (
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: SEP }}>
              <p className="text-xs" style={{ color: '#8fa3b8' }}>시도지사 정보 없음</p>
            </div>
          )}

          {/* 기초단체장 목록 헤더 */}
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
               style={{ borderBottom: SEP, background: 'rgba(100,135,165,0.04)' }}>
            <span className="text-xs font-semibold" style={{ color: '#8fa3b8' }}>기초단체장</span>
            <span className="text-xs" style={{ color: '#8fa3b8' }}>{districts.length}명</span>
          </div>

          {/* 기초단체장 목록 */}
          <div className="flex-1 overflow-y-auto">
            {districts.length === 0 && (
              <div className="flex items-center justify-center h-24">
                <p className="text-sm" style={{ color: '#8fa3b8' }}>기초단체장 정보가 없습니다.</p>
              </div>
            )}
            {districts.map((gov, i) => {
              const color = getPartyColor(gov.party);
              return (
                <button
                  key={gov.huboid}
                  onClick={() => onGovernorSelect(gov.huboid)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:opacity-80"
                  style={{ borderBottom: i < districts.length - 1 ? SEP : 'none', background: 'transparent' }}>
                  <div className="w-1 self-stretch rounded-full flex-shrink-0"
                       style={{ background: color, minHeight: 32 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold truncate">{gov.name}</span>
                      <span className="text-xs flex-shrink-0" style={{ color }}>{gov.party ?? '무소속'}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#8fa3b8' }}>{gov.sggName}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" style={{ color: 'rgba(100,135,165,0.5)', flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}

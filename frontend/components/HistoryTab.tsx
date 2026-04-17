'use client';

import { useEffect, useState } from 'react';
import { districtApi } from '@/lib/api';
import type { HistoricalRepresentativeResponse } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

interface HistoryTabProps {
  sggCode?: string;
}

export function HistoryTab({ sggCode }: HistoryTabProps) {
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
            className="flex items-center gap-3 rounded-xl p-3 bg-surface-high"
            style={{ border: '1px solid rgba(100,135,165,0.25)' }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-manrope font-bold text-xs"
              style={{ background: `${partyColor}22`, color: partyColor, border: `1px solid ${partyColor}44` }}
            >
              {rep.termNumber}대
            </div>
            {rep.photoUrl ? (
              <img
                src={rep.photoUrl}
                alt={rep.name}
                className="w-8 h-10 object-cover rounded-lg shrink-0"
                style={{ border: '1px solid rgba(100,135,165,0.3)' }}
              />
            ) : (
              <div
                className="w-8 h-10 rounded-lg shrink-0 flex items-center justify-center font-manrope text-xs font-bold"
                style={{ background: 'var(--color-surface-high)', color: 'var(--color-primary)' }}
              >
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

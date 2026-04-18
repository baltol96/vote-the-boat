'use client';

import { useEffect, useState } from 'react';
import { memberApi, VoteHighlightResponse } from '@/lib/api';

const SEP = '1px solid rgba(100,135,165,0.25)';

const RESULT_LABEL: Record<string, string> = {
  YES:     '찬성',
  NO:      '반대',
  ABSTAIN: '기권',
};

const RESULT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  YES:     { bg: 'rgba(52,211,153,0.12)',  color: '#059669', border: 'rgba(52,211,153,0.3)' },
  NO:      { bg: 'rgba(248,113,113,0.12)', color: '#dc2626', border: 'rgba(248,113,113,0.3)' },
  ABSTAIN: { bg: 'rgba(148,163,184,0.12)', color: '#64748b', border: 'rgba(148,163,184,0.3)' },
};

interface Props {
  monaCd: string;
}

export function VoteHighlights({ monaCd }: Props) {
  const [votes, setVotes]     = useState<VoteHighlightResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    memberApi.getVoteHighlights(monaCd)
      .then(setVotes)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [monaCd]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: '#0d6e69' }}
        />
      </div>
    );
  }

  if (error) {
    return <p className="font-jakarta text-xs text-on-surface/40">데이터를 불러오지 못했습니다.</p>;
  }

  if (votes.length === 0) {
    return <p className="font-jakarta text-xs text-on-surface/40">표결 내역이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {votes.map((vote) => {
        const style = RESULT_STYLE[vote.result] ?? RESULT_STYLE.ABSTAIN;

        return (
          <div
            key={vote.billNo}
            className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ border: SEP, background: 'rgba(100,135,165,0.04)' }}
          >
            {/* 결과 배지 */}
            <span
              className="shrink-0 px-2 py-0.5 rounded-full font-jakarta text-[11px] font-semibold mt-0.5"
              style={{
                background: style.bg,
                color:      style.color,
                border:     `1px solid ${style.border}`,
              }}
            >
              {RESULT_LABEL[vote.result]}
            </span>

            {/* 법안 정보 */}
            <div className="flex flex-col gap-0.5 min-w-0">
              {vote.billUrl ? (
                <a
                  href={vote.billUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-jakarta text-xs text-on-surface/80 leading-snug line-clamp-2 hover:text-primary transition-colors"
                >
                  {vote.billName}
                </a>
              ) : (
                <p className="font-jakarta text-xs text-on-surface/80 leading-snug line-clamp-2">
                  {vote.billName}
                </p>
              )}

              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-jakarta text-[10px] text-on-surface/35">{vote.voteDt}</span>
                {vote.committee && (
                  <>
                    <span className="text-on-surface/20 text-[10px]">·</span>
                    <span className="font-jakarta text-[10px] text-on-surface/35 truncate">{vote.committee}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <p
        className="font-jakarta text-[10px] text-on-surface/30 pt-2 text-center"
        style={{ borderTop: SEP }}
      >
        최근 표결 내역 (불참 제외) · 판단은 시민이 합니다
      </p>
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { memberApi, VoteSummaryResponse } from '@/lib/api';

const WordCloudChart = dynamic(() => import('./WordCloudChart'), { ssr: false });

const SEP = '1px solid rgba(100,135,165,0.25)';

// 찬성 > 반대 → 녹색, 반대 > 찬성 → 빨강, 그 외 → 회색
function dominantColor(yes: number, no: number): string {
  if (yes > no) return '#059669';
  if (no > yes) return '#dc2626';
  return '#64748b';
}

interface Props {
  monaCd: string;
}

export function VoteHighlights({ monaCd }: Props) {
  const [data, setData]       = useState<VoteSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    memberApi.getVoteHighlights(monaCd)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [monaCd]);

  const { words, colorMap } = useMemo(() => {
    if (!data) return { words: [], colorMap: {} };

    const colorMap: Record<string, string> = {};
    const words = data.categories.flatMap((cat) => {
      const color = dominantColor(cat.yes, cat.no);
      return cat.topKeywords.map((kw) => {
        colorMap[kw] = color;
        return { text: kw, value: cat.yes + cat.no + cat.abstain };
      });
    });

    return { words, colorMap };
  }, [data]);

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

  if (error || !data) {
    return <p className="font-jakarta text-xs text-on-surface/40">데이터를 불러오지 못했습니다.</p>;
  }

  if (data.totalVotes === 0 || data.categories.length === 0) {
    return <p className="font-jakarta text-xs text-on-surface/40">표결 내역이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-manrope text-2xl font-bold text-on-surface">{data.totalVotes}</span>
        <span className="font-jakarta text-xs text-on-surface/50">건 표결 참여</span>
      </div>

      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: 260, background: 'rgba(100,135,165,0.04)', border: SEP }}
      >
        {words.length > 0 && (
          <WordCloudChart
            words={words}
            getWordColor={(word) => colorMap[word.text] ?? '#64748b'}
          />
        )}
      </div>

      {/* 카테고리별 찬성/반대 범례 */}
      <div className="flex flex-col gap-1.5">
        {data.categories.map((cat) => {
          const total = cat.yes + cat.no + cat.abstain;
          const color = dominantColor(cat.yes, cat.no);
          return (
            <div key={cat.category} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="font-jakarta text-[10px] text-on-surface/60 w-14 shrink-0">{cat.category}</span>
              <span className="font-jakarta text-[10px] text-on-surface/40">
                찬성 {cat.yes} · 반대 {cat.no}
                {cat.abstain > 0 && ` · 기권 ${cat.abstain}`}
                <span className="text-on-surface/25 ml-1">({total}건)</span>
              </span>
            </div>
          );
        })}
      </div>

      <p
        className="font-jakarta text-[10px] text-on-surface/30 pt-2 text-center"
        style={{ borderTop: SEP }}
      >
        불참 제외 표결 기준 · 판단은 시민이 합니다
      </p>
    </div>
  );
}

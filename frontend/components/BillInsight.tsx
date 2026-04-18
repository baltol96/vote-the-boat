'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { memberApi, BillSummaryResponse } from '@/lib/api';

const ReactWordcloud = dynamic(() => import('react-wordcloud'), { ssr: false });

const SEP = '1px solid rgba(100,135,165,0.25)';

const CATEGORY_COLOR: Record<string, string> = {
  복지:    '#34d399',
  교육:    '#60a5fa',
  경제:    '#fbbf24',
  법무:    '#f87171',
  환경:    '#4ade80',
  안보:    '#94a3b8',
  행정:    '#c084fc',
  문화:    '#f472b6',
  과학기술: '#22d3ee',
  기타:    '#6b7280',
};

const WORDCLOUD_OPTIONS = {
  rotations: 2,
  rotationAngles: [0, 0] as [number, number],
  fontSizes: [13, 52] as [number, number],
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  fontWeight: 'bold',
  padding: 4,
  spiral: 'archimedean' as const,
  enableTooltip: false,
  deterministic: true,
};

interface Props {
  monaCd: string;
}

export function BillInsight({ monaCd }: Props) {
  const [data, setData]       = useState<BillSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    memberApi.getBillSummary(monaCd)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [monaCd]);

  const { words, colorMap } = useMemo(() => {
    if (!data) return { words: [], colorMap: {} };

    const colorMap: Record<string, string> = {};
    const words = data.categories.flatMap((cat) => {
      const color = CATEGORY_COLOR[cat.category] ?? '#6b7280';
      return cat.topKeywords.map((kw) => {
        colorMap[kw] = color;
        return { text: kw, value: cat.count };
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

  if (data.totalBills === 0 || data.categories.length === 0) {
    return <p className="font-jakarta text-xs text-on-surface/40">발의 법안이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-manrope text-2xl font-bold text-on-surface">{data.totalBills}</span>
        <span className="font-jakarta text-xs text-on-surface/50">건 발의</span>
      </div>

      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: 260, background: 'rgba(100,135,165,0.04)', border: SEP }}
      >
        {words.length > 0 && (
          <ReactWordcloud
            words={words}
            options={WORDCLOUD_OPTIONS}
            callbacks={{
              getWordColor: (word) => colorMap[word.text] ?? '#6b7280',
            }}
          />
        )}
      </div>

      {/* 카테고리 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {data.categories.map((cat) => {
          const color = CATEGORY_COLOR[cat.category] ?? '#6b7280';
          return (
            <span key={cat.category} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="font-jakarta text-[10px] text-on-surface/50">{cat.category} {cat.count}건</span>
            </span>
          );
        })}
      </div>

    </div>
  );
}

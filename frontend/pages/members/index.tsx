import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { memberApi, MemberResponse } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

const SEP = 'rgba(100,135,165,0.4)';

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function CloseSmIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

const PARTY_FILTERS = ['전체', '더불어민주당', '국민의힘', '조국혁신당', '개혁신당', '기타'];
const ELECTED_FILTERS: { label: string; value: 'all' | 'DISTRICT' | 'PROPORTIONAL' }[] = [
  { label: '전체', value: 'all' },
  { label: '지역구', value: 'DISTRICT' },
  { label: '비례대표', value: 'PROPORTIONAL' },
];

export default function MembersPage() {
  const [allMembers, setAllMembers]       = useState<MemberResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedParty, setSelectedParty] = useState('전체');
  const [electedType, setElectedType]     = useState<'all' | 'DISTRICT' | 'PROPORTIONAL'>('all');

  useEffect(() => {
    setLoading(true);
    memberApi.search({})
      .then(results => setAllMembers(results))
      .catch(() => setAllMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const members = useMemo(() => {
    let filtered = allMembers;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.party.toLowerCase().includes(q) ||
        (m.district || '').toLowerCase().includes(q)
      );
    }
    if (selectedParty !== '전체') {
      if (selectedParty === '기타') {
        const major = ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당'];
        filtered = filtered.filter(m => !major.includes(m.party));
      } else {
        filtered = filtered.filter(m => m.party === selectedParty);
      }
    }
    if (electedType !== 'all') {
      const typeMap: Record<string, string[]> = {
        DISTRICT: ['지역구'],
        PROPORTIONAL: ['비례대표'],
      };
      filtered = filtered.filter(m => typeMap[electedType]?.some(t => m.electionType?.includes(t)));
    }
    return filtered;
  }, [allMembers, searchQuery, selectedParty, electedType]);

  return (
    <>
      <Head>
        <title>전체 의원 — Vote the Boat</title>
        <meta name="description" content="22대 국회 300명 의원 전체 목록. 지역구·비례대표 포함." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex flex-col h-screen font-inter overflow-hidden"
           style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)' }}>

        {/* ── 헤더 ── */}
        <header
          className="flex items-center justify-center gap-3 px-4 h-14 shrink-0 z-20"
          style={{
            background: 'rgba(244,247,251,0.94)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${SEP}`,
          }}
        >
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 select-none">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-manrope font-bold"
              style={{
                background: 'var(--color-primary-container)',
                color: 'var(--color-primary-fixed)',
                fontSize: '0.55rem',
                letterSpacing: '0.04em',
              }}
            >
              V/B
            </div>
            <div className="hidden sm:flex flex-col leading-none gap-0.5">
              <span className="font-manrope text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>
                Vote the Boat
              </span>
              <span
                className="font-jakarta font-medium"
                style={{ fontSize: '0.6rem', color: 'var(--color-primary)', letterSpacing: '0.04em' }}
              >
                22대 국회 의정활동 투명성
              </span>
            </div>
          </Link>

          <div className="h-5 w-px shrink-0" style={{ background: SEP }} />

          {/* 페이지 탭 */}
          <nav className="flex items-center gap-0.5 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg font-jakarta text-xs font-medium transition-colors hover:opacity-80"
              style={{
                color: 'var(--color-on-surface)',
                opacity: 0.55,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              지도
            </Link>
            <span
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg font-jakarta text-xs font-semibold"
              style={{
                background: 'var(--color-primary-container)',
                color: 'var(--color-primary-fixed)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              전체 의원
            </span>
          </nav>

          <div className="h-5 w-px shrink-0" style={{ background: SEP }} />

          {/* 검색바 */}
          <div className="relative w-64">
            <div
              className="flex items-center gap-2 px-3 h-8 rounded-lg"
              style={{
                background: 'rgba(220,228,238,0.8)',
                border: `1px solid rgba(100,135,165,0.4)`,
              }}
            >
              <span style={{ color: 'var(--color-primary)', opacity: 0.7, flexShrink: 0 }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="의원 이름 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none font-jakarta text-xs search-input"
                style={{ color: 'var(--color-on-surface)' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="shrink-0 transition-opacity hover:opacity-100"
                  style={{ color: 'var(--color-on-surface)', opacity: 0.35 }}
                >
                  <CloseSmIcon />
                </button>
              )}
            </div>
          </div>

          {/* 통계 뱃지 */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 font-jakarta"
            style={{
              fontSize: '0.68rem',
              background: 'rgba(220,228,238,0.85)',
              border: `1px solid ${SEP}`,
            }}
          >
            <span className="font-manrope font-bold" style={{ color: 'var(--color-primary)' }}>
              {loading ? '…' : members.length}
            </span>
            <span style={{ color: 'var(--color-on-surface)', opacity: 0.5 }}>명</span>
          </div>
        </header>

        {/* ── 필터 바 ── */}
        <div
          className="flex items-center gap-3 px-5 h-11 shrink-0 overflow-x-auto"
          style={{
            background: 'rgba(244,247,251,0.9)',
            borderBottom: `1px solid ${SEP}`,
          }}
        >
          {/* 선출방식 */}
          <div className="flex items-center gap-1 shrink-0">
            {ELECTED_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setElectedType(f.value)}
                className="px-2.5 h-6 rounded-md font-jakarta text-xs font-medium transition-all"
                style={{
                  background: electedType === f.value ? 'var(--color-primary)' : 'rgba(220,228,238,0.7)',
                  color: electedType === f.value ? '#fff' : 'var(--color-on-surface)',
                  opacity: electedType === f.value ? 1 : 0.65,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px shrink-0" style={{ background: SEP }} />

          {/* 정당 필터 */}
          <div className="flex items-center gap-1">
            {PARTY_FILTERS.map(party => (
              <button
                key={party}
                onClick={() => setSelectedParty(party)}
                className="px-2.5 h-6 rounded-md font-jakarta text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: selectedParty === party
                    ? (party === '전체' ? 'var(--color-primary)' : `${getPartyColor(party)}22`)
                    : 'rgba(220,228,238,0.7)',
                  color: selectedParty === party
                    ? (party === '전체' ? '#fff' : getPartyColor(party))
                    : 'var(--color-on-surface)',
                  border: selectedParty === party && party !== '전체'
                    ? `1px solid ${getPartyColor(party)}55`
                    : '1px solid transparent',
                  opacity: selectedParty === party ? 1 : 0.65,
                }}
              >
                {party}
              </button>
            ))}
          </div>
        </div>

        {/* ── 목록 ── */}
        <main className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(13,110,105,0.15)', borderTopColor: 'var(--color-primary)' }}
              />
            </div>
          ) : members.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="font-jakarta text-sm" style={{ color: 'var(--color-on-surface)', opacity: 0.4 }}>
                검색 결과가 없습니다
              </p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {members.map(member => (
                <Link
                  key={member.monaCd}
                  href={`/members/${member.monaCd}`}
                  className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                  style={{
                    background: 'var(--color-surface-low)',
                    border: `1px solid rgba(100,135,165,0.18)`,
                    boxShadow: '0 1px 4px rgba(13,110,105,0.04)',
                  }}
                >
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      loading="lazy"
                      className="w-full object-cover"
                      style={{ aspectRatio: '500/700', display: 'block' }}
                    />
                  ) : (
                    <div
                      className="w-full flex items-center justify-center font-manrope text-2xl font-bold"
                      style={{
                        aspectRatio: '500/700',
                        background: 'var(--color-surface-high)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {member.name[0]}
                    </div>
                  )}
                  <div
                    className="px-3 py-2"
                    style={{ borderTop: `2px solid ${getPartyColor(member.party)}55` }}
                  >
                    <div
                      className="font-manrope text-sm font-semibold truncate"
                      style={{ color: 'var(--color-on-surface)' }}
                    >
                      {member.name}
                    </div>
                    <div
                      className="font-jakarta text-xs truncate mt-0.5"
                      style={{ color: getPartyColor(member.party) }}
                    >
                      {member.party}
                    </div>
                    <div
                      className="font-jakarta truncate mt-0.5"
                      style={{ fontSize: '0.65rem', color: 'var(--color-on-surface)', opacity: 0.45 }}
                    >
                      {member.district || '비례대표'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

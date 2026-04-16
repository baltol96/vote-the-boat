import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MemberPanel from '@/components/MemberPanel';
import { districtApi, memberApi, MemberResponse } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';
import type { MapViewMode } from '@/components/DistrictMap';

const DistrictMap = dynamic(() => import('@/components/DistrictMap'), { ssr: false });

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

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
    </svg>
  );
}

export default function Home() {
  const [selectedSggCode, setSelectedSggCode] = useState<string | undefined>();
  const [selectedMonaCd, setSelectedMonaCd] = useState<string | undefined>();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loadingMember, setLoadingMember] = useState(false);
  const [selectedPartyColor, setSelectedPartyColor] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>('sido');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 바텀 시트 드래그
  const SNAP_EXPANDED = 90;
  const SNAP_DEFAULT = 90;
  const SNAP_COLLAPSED = 40;
  const [sheetHeight, setSheetHeight] = useState(SNAP_DEFAULT);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(SNAP_DEFAULT);
  const isDragging = useRef(false);

  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
    isDragging.current = true;
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const dy = dragStartY.current - e.touches[0].clientY;
    const newH = Math.min(SNAP_EXPANDED, Math.max(15, dragStartHeight.current + (dy / window.innerHeight) * 100));
    setSheetHeight(newH);
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    setSheetHeight(h => {
      if (h < (SNAP_COLLAPSED + SNAP_DEFAULT) / 2) return SNAP_COLLAPSED;
      if (h < (SNAP_DEFAULT + SNAP_EXPANDED) / 2) return SNAP_DEFAULT;
      return SNAP_EXPANDED;
    });
  };

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 디바운스
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await memberApi.search({ name: q });
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchQuery]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 토스트
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDistrictSelect = async (sggCode: string) => {
    setSelectedSggCode(sggCode);
    setSelectedPartyColor(undefined);
    setSheetHeight(SNAP_DEFAULT);
    setLoadingMember(true);
    try {
      const member = await districtApi.getMemberBySggCode(sggCode);
      setSelectedMonaCd(member.monaCd);
      setSelectedPartyColor(getPartyColor(member.party));
      setIsPanelOpen(true);
    } catch {
      showToast('해당 선거구 의원 정보를 찾을 수 없습니다.');
    } finally {
      setLoadingMember(false);
    }
  };

  const handleSearchSelect = (member: MemberResponse) => {
    setSelectedMonaCd(member.monaCd);
    setIsPanelOpen(true);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  return (
    <>
      <Head>
        <title>Vote the Boat — 국회의원 의정활동 투명성 플랫폼</title>
        <meta name="description" content="내가 뽑은 의원은 무엇을 하고 있는가? 지도에서 내 지역구를 클릭해 의원의 법안·표결·재산을 확인하세요." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Vote the Boat — 국회의원 의정활동" />
        <meta property="og:description" content="내가 뽑은 의원은 무엇을 하고 있는가?" />
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
          <div className="flex items-center gap-2.5 shrink-0 select-none">
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
          </div>

          {/* 구분선 */}
          <div className="h-5 w-px shrink-0" style={{ background: SEP }} />

          {/* 검색바 */}
          <div ref={searchRef} className="relative w-64">
            <div
              className="flex items-center gap-2 px-3 h-8 rounded-lg transition-all duration-200"
              style={{
                background: 'rgba(220,228,238,0.8)',
                border: `1px solid ${
                  searchFocused ? 'rgba(13,110,105,0.4)' : 'rgba(100,135,165,0.4)'
                }`,
              }}
            >
              <span style={{ color: 'var(--color-primary)', opacity: 0.7, flexShrink: 0 }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="의원 이름·정당·지역 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="flex-1 bg-transparent outline-none font-jakarta text-xs search-input"
                style={{ color: 'var(--color-on-surface)' }}
              />
              {searchLoading && (
                <div
                  className="w-3 h-3 rounded-full border animate-spin shrink-0"
                  style={{ borderColor: 'rgba(13,110,105,0.2)', borderTopColor: 'var(--color-primary)' }}
                />
              )}
              {searchQuery && !searchLoading && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="shrink-0 transition-opacity hover:opacity-100"
                  style={{ color: 'var(--color-on-surface)', opacity: 0.35 }}
                >
                  <CloseSmIcon />
                </button>
              )}
            </div>

            {/* 검색 드롭다운 */}
            {showDropdown && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50"
                style={{
                  background: '#f4f7fb',
                  border: `1px solid ${SEP}`,
                  boxShadow: '0 8px 32px rgba(13,110,105,0.12)',
                  minWidth: '260px',
                }}
              >
                {searchResults.length === 0 && !searchLoading && (
                  <div
                    className="px-4 py-3 font-jakarta text-xs"
                    style={{ color: 'var(--color-on-surface)', opacity: 0.4 }}
                  >
                    검색 결과가 없습니다
                  </div>
                )}
                {searchResults.map((member, idx) => (
                  <button
                    key={member.monaCd}
                    onClick={() => handleSearchSelect(member)}
                    className="search-result-item w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    style={{
                      borderBottom: idx < searchResults.length - 1
                        ? `1px solid rgba(100,135,165,0.2)`
                        : 'none',
                    }}
                  >
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-7 h-8 object-cover rounded-md shrink-0"
                        style={{ border: `1px solid ${SEP}` }}
                      />
                    ) : (
                      <div
                        className="w-7 h-8 rounded-md shrink-0 flex items-center justify-center font-manrope text-xs font-bold"
                        style={{ background: 'var(--color-surface-high)', color: 'var(--color-primary)' }}
                      >
                        {member.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-manrope text-xs font-semibold truncate"
                        style={{ color: 'var(--color-on-surface)' }}
                      >
                        {member.name}
                      </div>
                      <div
                        className="font-jakarta truncate"
                        style={{ fontSize: '0.65rem', color: 'var(--color-primary)', opacity: 0.8 }}
                      >
                        {member.party} · {member.district}
                      </div>
                    </div>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      style={{ color: 'var(--color-primary)', opacity: 0.45, flexShrink: 0 }}
                    >
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
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
            <span className="font-manrope font-bold" style={{ color: 'var(--color-primary)' }}>300</span>
            <span style={{ color: 'var(--color-on-surface)', opacity: 0.5 }}>명</span>
            <span style={{ color: SEP }}>·</span>
            <span className="font-manrope font-bold" style={{ color: 'var(--color-primary)' }}>253</span>
            <span style={{ color: 'var(--color-on-surface)', opacity: 0.5 }}>개 선거구</span>
          </div>
        </header>

        {/* ── 본문 ── */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* 지도 영역 */}
          <div className="map-ocean-wrap flex-1 relative overflow-hidden">
            <DistrictMap
              onDistrictSelect={handleDistrictSelect}
              selectedSggCode={selectedSggCode}
              selectedPartyColor={selectedPartyColor}
              onViewModeChange={(mode) => {
                setMapViewMode(mode);
                if (mode === 'sido') {
                  setIsPanelOpen(false);
                  setSelectedPartyColor(undefined);
                  setSelectedSggCode(undefined);
                }
              }}
              isPanelOpen={isPanelOpen}
            />

            {/* 지도 로딩 오버레이 */}
            {loadingMember && (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center"
                style={{
                  background: 'rgba(244,247,251,0.55)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'rgba(13,110,105,0.15)', borderTopColor: 'var(--color-primary)' }}
                  />
                  <span className="font-jakarta text-xs" style={{ color: 'var(--color-primary)', opacity: 0.75 }}>
                    의원 정보 불러오는 중…
                  </span>
                </div>
              </div>
            )}

            {/* 하단 중앙 힌트 */}
            {!isPanelOpen && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] pointer-events-none">
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full font-jakarta font-medium whitespace-nowrap"
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(244,247,251,0.88)',
                    border: `1px solid ${SEP}`,
                    backdropFilter: 'blur(10px)',
                    color: 'var(--color-on-surface)',
                    opacity: 0.85,
                    boxShadow: '0 2px 12px rgba(13,110,105,0.08)',
                  }}
                >
                  <span style={{ color: 'var(--color-primary)' }}><PinIcon /></span>
                  {mapViewMode === 'sido'
                    ? '시/도를 클릭하면 선거구를 확인할 수 있습니다'
                    : '선거구를 클릭하면 의원 정보를 확인할 수 있습니다'}
                </div>
              </div>
            )}

          </div>

          {/* ── 사이드 패널 (데스크톱) ── */}
          {!isMobile && (
            <aside
              className="member-panel shrink-0 overflow-hidden flex flex-col"
              style={{
                width: isPanelOpen && selectedMonaCd ? '440px' : '0px',
                transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                borderLeft: `1px solid ${isPanelOpen ? SEP : 'transparent'}`,
                background: 'var(--color-surface-low)',
              }}
            >
              {isPanelOpen && selectedMonaCd && (
                <MemberPanel
                  monaCd={selectedMonaCd}
                  sggCode={selectedSggCode}
                  onClose={() => { setIsPanelOpen(false); setSelectedPartyColor(undefined); setSelectedSggCode(undefined); }}
                />
              )}
            </aside>
          )}
        </div>

        {/* ── 바텀 시트 (모바일) ── */}
        {isMobile && selectedMonaCd && (
          <>
            {/* 딤 오버레이 */}
            {isPanelOpen && (
              <div
                className="fixed inset-0 z-[1500]"
                style={{ background: 'rgba(26,37,53,0.35)', backdropFilter: 'blur(2px)' }}
                onClick={() => { setIsPanelOpen(false); setSelectedPartyColor(undefined); }}
              />
            )}
            {/* 바텀 시트 */}
            <div
              className="fixed inset-x-0 bottom-0 z-[1600] flex flex-col overflow-hidden"
              style={{
                height: `${sheetHeight}vh`,
                borderRadius: '20px 20px 0 0',
                background: 'var(--color-surface-low)',
                borderTop: `1px solid ${SEP}`,
                boxShadow: '0 -8px 32px rgba(13,110,105,0.12)',
                transform: isPanelOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: isDragging.current
                  ? 'none'
                  : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* 드래그 핸들 */}
              <div
                className="flex justify-center items-center shrink-0 cursor-grab active:cursor-grabbing touch-none"
                style={{ paddingTop: '14px', paddingBottom: '14px' }}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(100,135,165,0.4)' }} />
              </div>
              <MemberPanel
                monaCd={selectedMonaCd}
                sggCode={selectedSggCode}
                onClose={() => { setIsPanelOpen(false); setSelectedPartyColor(undefined); setSelectedSggCode(undefined); }}
              />
            </div>
          </>
        )}

        {/* ── 토스트 ── */}
        {toast && (
          <div
            className="toast-in fixed bottom-5 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-xl font-jakarta text-xs font-medium flex items-center gap-2"
            style={{
              background: '#fff1f2',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#dc2626',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

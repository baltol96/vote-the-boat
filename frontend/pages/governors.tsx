import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import GovernorPanel from '@/components/GovernorPanel';
import GovernorSplitPanel from '@/components/GovernorSplitPanel';

const GovernorMap = dynamic(() => import('@/components/GovernorMap'), { ssr: false });

export default function GovernorsPage() {
  const [selectedSdName, setSelectedSdName] = useState<string | null>(null);
  const [selectedHuboid, setSelectedHuboid] = useState<string | null>(null);
  const [isMobile, setIsMobile]             = useState(false);
  const [sheetHeight, setSheetHeight]       = useState(40);

  const dragStartY      = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(40);
  const isDragging      = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSidoClick = (sdName: string) => {
    setSelectedSdName(sdName);
    setSelectedHuboid(null);
    if (isMobile) setSheetHeight(90);
  };

  const handleGovernorSelect = (huboid: string) => {
    setSelectedHuboid(huboid);
    if (isMobile) setSheetHeight(90);
  };

  const handleClose = () => {
    if (selectedHuboid && selectedSdName) {
      // 상세 → 스플릿 패널로 복귀
      setSelectedHuboid(null);
    } else {
      setSelectedSdName(null);
      setSelectedHuboid(null);
      if (isMobile) setSheetHeight(40);
    }
  };

  const isPanelOpen = !!selectedSdName || !!selectedHuboid;

  const panelContent = (() => {
    if (selectedHuboid) {
      return (
        <GovernorPanel
          huboid={selectedHuboid}
          onClose={handleClose}
        />
      );
    }
    if (selectedSdName) {
      return (
        <GovernorSplitPanel
          sdName={selectedSdName}
          onGovernorSelect={handleGovernorSelect}
          onClose={handleClose}
        />
      );
    }
    return null;
  })();

  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
    isDragging.current = true;
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const dy = dragStartY.current - e.touches[0].clientY;
    const vh = window.innerHeight;
    const newH = Math.min(95, Math.max(15, dragStartHeight.current + (dy / vh) * 100));
    setSheetHeight(newH);
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    const SNAP_POINTS = [15, 40, 90];
    const closest = SNAP_POINTS.reduce((a, b) =>
      Math.abs(a - sheetHeight) < Math.abs(b - sheetHeight) ? a : b
    );
    setSheetHeight(closest);
    if (closest === 15) handleClose();
  };

  return (
    <>
      <Head>
        <title>지자체장 지도 — 내가 뽑은 보트</title>
      </Head>

      <div className="flex flex-col h-screen overflow-hidden"
           style={{ background: 'var(--color-bg, #1a2332)', color: 'var(--color-text, #e8edf3)' }}>

        {/* 상단 네비 */}
        <nav className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0 z-10"
             style={{ borderBottom: '1px solid rgba(100,135,165,0.2)', background: 'rgba(26,35,50,0.95)', backdropFilter: 'blur(8px)' }}>
          <Link href="/"
                className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: '#8fa3b8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            국회의원
          </Link>
          <span style={{ color: 'rgba(100,135,165,0.4)' }}>|</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary, #2bb5ae)' }}>지자체장</span>
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(43,181,174,0.12)', color: '#2bb5ae' }}>
            2022 지방선거
          </span>
        </nav>

        {/* 지도 + 패널 레이아웃 */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* 지도 */}
          <div className="flex-1 relative transition-all duration-300"
               style={{ marginRight: !isMobile && isPanelOpen ? 440 : 0 }}>
            <GovernorMap
              onSidoClick={handleSidoClick}
              onSigunguClick={handleGovernorSelect}
              selectedSdName={selectedSdName ?? undefined}
              isPanelOpen={!isMobile && isPanelOpen}
            />
          </div>

          {/* 데스크톱 사이드 패널 */}
          {!isMobile && (
            <div
              className="absolute top-0 right-0 h-full overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                width: 440,
                transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
                borderLeft: '1px solid rgba(100,135,165,0.2)',
                background: 'var(--color-panel-bg, #f4f7fb)',
                zIndex: 20,
              }}>
              {panelContent}
            </div>
          )}

          {/* 모바일 바텀 시트 */}
          {isMobile && isPanelOpen && (
            <div
              className="absolute left-0 right-0 bottom-0 rounded-t-2xl overflow-hidden"
              style={{
                height: `${sheetHeight}vh`,
                zIndex: 30,
                background: 'var(--color-panel-bg, #f4f7fb)',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
                transition: isDragging.current ? 'none' : 'height 0.2s ease-out',
              }}>
              <div
                className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}>
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(100,135,165,0.3)' }} />
              </div>
              <div className="overflow-y-auto" style={{ height: 'calc(100% - 28px)' }}>
                {panelContent}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .governor-tooltip {
          background: rgba(26,35,50,0.92) !important;
          border: 1px solid rgba(100,135,165,0.3) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          color: #e8edf3 !important;
          padding: 6px 10px !important;
          backdrop-filter: blur(8px);
        }
        .governor-tooltip::before { display: none !important; }
      `}</style>
    </>
  );
}

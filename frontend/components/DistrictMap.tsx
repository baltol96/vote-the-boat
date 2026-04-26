'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapSelect } from './MapSelect';
import { useMapLayers } from '@/hooks/useMapLayers';
import type { MapViewMode } from '@/hooks/useMapLayers';

export type { MapViewMode };

interface DistrictMapProps {
  onDistrictSelect: (sggCode: string) => void;
  selectedSggCode?: string;
  selectedPartyColor?: string;
  onViewModeChange?: (mode: MapViewMode, selectedSido?: string) => void;
  isPanelOpen?: boolean;
}

export default function DistrictMap({
  onDistrictSelect,
  selectedSggCode,
  selectedPartyColor,
  onViewModeChange,
  isPanelOpen,
}: DistrictMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<LeafletMap | null>(null);
  const LRef            = useRef<any>(null);
  const isPanelOpenRef  = useRef(isPanelOpen ?? false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => { isPanelOpenRef.current = isPanelOpen ?? false; }, [isPanelOpen]);

  const {
    viewMode,
    sidoOptions,
    districtOptions,
    selectSido,
    selectDistrict,
    districtLoading,
    handleSidoSelect,
    handleDistrictSelect,
    initSidoLayer,
    prefetchDistricts,
    viewModeRef,
  } = useMapLayers({
    mapRef,
    LRef,
    isPanelOpenRef,
    onDistrictSelect,
    onViewModeChange,
    selectedSggCode,
    selectedPartyColor,
  });

  // ── 패널 열림/닫힘 시 지도 위치 조정 ────────────────────────
  const prevPanelOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevPanelOpenRef.current;
    const isOpen = isPanelOpen ?? false;
    prevPanelOpenRef.current = isOpen;

    const map = mapRef.current;
    if (!map || isOpen === wasOpen || window.innerWidth < 768) return;

    if (!isOpen && viewModeRef.current === 'sido') {
      setTimeout(() => map.invalidateSize({ pan: false }), 320);
      return;
    }

    const offset = 440 / 2;
    map.panBy(isOpen ? [offset, 0] : [-offset, 0], { animate: true, duration: 0.28 });
    setTimeout(() => map.invalidateSize({ pan: false }), 320);
  }, [isPanelOpen, viewModeRef]);

  // ── Leaflet 초기화 (마운트 1회) ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !mapContainerRef.current) return;
        LRef.current = L;

        const koreaBounds = L.latLngBounds([31.5, 123.5], [39.5, 134.0]);
        const map = L.map(mapContainerRef.current, {
          center: [36.3, 127.8], zoom: 7,
          zoomControl: false,
          maxBounds: koreaBounds, maxBoundsViscosity: 1.0,
          minZoom: 6, maxZoom: 13,
          boxZoom: false, zoomAnimationThreshold: 10,
        });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapRef.current = map;

        const setFilterPaused = (p: boolean) => {
          const pane = mapContainerRef.current?.querySelector('.leaflet-overlay-pane') as HTMLElement | null;
          pane?.classList.toggle('map-pane-paused', p);
        };
        map.on('zoomstart movestart', () => setFilterPaused(true));
        map.on('zoomend moveend',     () => setFilterPaused(false));

        const res = await fetch('/data/sido.geojson');
        if (!res.ok) throw new Error('시/도 데이터를 불러올 수 없습니다');
        const sidoGeoJson = await res.json();
        if (cancelled) return;

        initSidoLayer(L, sidoGeoJson);
        setIsLoading(false);

        // 탭 전환 시 패널 닫힘 애니메이션(280ms) 후 컨테이너 크기가 확정되므로 재계산
        setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 350);

        // 백그라운드 프리패치 (훅의 distCacheRef에 저장)
        prefetchDistricts([
          'seoul','gyeonggi','busan','incheon','daegu','daejeon',
          'gwangju','ulsan','sejong','gangwon','chungbuk','chungnam',
          'jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju',
        ]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '지도 로딩 실패');
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center"
             style={{ background: 'var(--color-map-bg)' }}>
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
               style={{ borderColor: 'rgba(43,181,174,0.15)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center"
             style={{ background: 'var(--color-map-bg)' }}>
          <p className="font-jakarta text-sm" style={{ color: '#ff8a80' }}>{error}</p>
        </div>
      )}

      {!isLoading && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-1.5"
          style={{ pointerEvents: 'auto' }}
        >
          {/* 전체 지도 버튼 */}
          <button
            onClick={viewMode === 'district' ? () => handleSidoSelect('') : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-jakarta font-medium text-xs transition-all whitespace-nowrap"
            style={{
              background: 'rgba(244,247,251,0.92)',
              border: '1px solid rgba(13,110,105,0.25)',
              backdropFilter: 'blur(8px)',
              color: '#0d6e69',
              boxShadow: '0 2px 8px rgba(13,110,105,0.1)',
              cursor: viewMode === 'district' ? 'pointer' : 'default',
              opacity: viewMode === 'sido' ? 0.65 : 1,
            }}
          >
            {viewMode === 'district' && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            )}
            전체 지도
          </button>

          <MapSelect
            value={selectSido}
            onChange={handleSidoSelect}
            placeholder="시/도 선택"
            options={sidoOptions.map(o => ({ label: o.name, value: o.code }))}
          />

          <MapSelect
            value={selectDistrict}
            onChange={handleDistrictSelect}
            placeholder="선거구 선택"
            options={districtOptions.map(o => ({ label: o.name, value: o.sggCode }))}
            disabled={!selectSido}
            loading={districtLoading}
          />
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" style={{ background: 'var(--color-map-bg)' }} />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';
import { memberApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

export type MapViewMode = 'sido' | 'district';

// ── 커스텀 셀렉트 ─────────────────────────────────────────────
interface MapSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
  disabled?: boolean;
  loading?: boolean;
}

function MapSelect({ value, onChange, placeholder, options, disabled, loading }: MapSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const borderColor = 'rgba(13,110,105,0.25)';
  const borderFocus = 'rgba(13,110,105,0.55)';
  const bg          = 'rgba(244,247,251,0.96)';
  const bgDropdown  = '#f0f4f9';
  const primary     = '#0d6e69';
  const textColor   = '#1a2e2d';
  const hoverBg     = 'rgba(13,110,105,0.08)';
  const activeBg    = 'rgba(13,110,105,0.14)';
  const shadow      = '0 2px 8px rgba(13,110,105,0.1)';
  const dropShadow  = '0 8px 24px rgba(13,110,105,0.14)';

  return (
    <div ref={ref} className="relative" style={{ minWidth: '108px' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-lg font-jakarta font-medium text-xs transition-all"
        style={{
          background: bg,
          border: `1px solid ${open ? borderFocus : borderColor}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: selected ? primary : 'rgba(13,110,105,0.4)',
          boxShadow: shadow,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{loading ? '불러오는 중…' : (selected?.label ?? placeholder)}</span>
        <svg
          width="9" height="9" viewBox="0 0 24 24" fill="none"
          stroke={primary} strokeWidth="2.5" strokeLinecap="round"
          style={{
            opacity: disabled ? 0.3 : 0.6,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden z-[1100]"
          style={{
            background: bgDropdown,
            border: `1px solid ${borderFocus}`,
            boxShadow: dropShadow,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            minWidth: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 font-jakarta text-xs" style={{ color: textColor, opacity: 0.4 }}>
              항목 없음
            </div>
          ) : (
            options.map((o, idx) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="w-full text-left px-3 py-2 font-jakarta text-xs transition-colors"
                  style={{
                    background: isSelected ? activeBg : 'transparent',
                    color: isSelected ? primary : textColor,
                    fontWeight: isSelected ? 600 : 400,
                    borderBottom: idx < options.length - 1 ? '1px solid rgba(13,110,105,0.08)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {isSelected && (
                    <svg
                      className="inline mr-1.5 -mt-0.5"
                      width="9" height="9" viewBox="0 0 24 24" fill="none"
                      stroke={primary} strokeWidth="3" strokeLinecap="round"
                    >
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                  {o.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface DistrictMapProps {
  onDistrictSelect: (sggCode: string) => void;
  selectedSggCode?: string;
  selectedPartyColor?: string;
  onViewModeChange?: (mode: MapViewMode, selectedSido?: string) => void;
}

function getColors() {
  return {
    mapBg:          '#2a8fa8',
    idle:           '#a8c87a',
    idleBorder:     '#789a50',
    idleOpacity:    0.9,
    hover:          '#0d6e69',
    hoverBorder:    '#0a5550',
    selected:       '#0a5550',
    selectedBorder: '#0d6e69',
  };
}

export default function DistrictMap({
  onDistrictSelect,
  selectedSggCode,
  selectedPartyColor,
  onViewModeChange,
}: DistrictMapProps) {
  const mapContainerRef   = useRef<HTMLDivElement>(null);
  const mapRef            = useRef<LeafletMap | null>(null);
  const LRef              = useRef<any>(null);
  const sidoGeoJsonRef    = useRef<any>(null);
  const sidoLayerRef      = useRef<LeafletGeoJSON | null>(null);
  const districtLayerRef  = useRef<LeafletGeoJSON | null>(null);
  const selectedRef       = useRef(selectedSggCode);
  const layerMapRef       = useRef<Map<string, any>>(new Map());
  const prevSelectedRef          = useRef<any>(null);
  const selectedPartyColorRef    = useRef<string | undefined>(undefined);
  const distCacheRef      = useRef<Map<string, any>>(new Map());
  const viewModeRef       = useRef<MapViewMode>('sido');
  // sggCode → 정당 색상 (연한 idle 색에 사용)
  const partyMapRef       = useRef<Map<string, string>>(new Map());

  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [viewMode, setViewMode]     = useState<MapViewMode>('sido');
  const [activeSido, setActiveSido] = useState<string | null>(null);
  const [sidoOptions, setSidoOptions] = useState<{ name: string; code: string }[]>([]);
  const [districtOptions, setDistrictOptions] = useState<{ name: string; sggCode: string }[]>([]);
  const [selectSido, setSelectSido] = useState('');
  const [selectDistrict, setSelectDistrict] = useState('');
  const [districtLoading, setDistrictLoading] = useState(false);

  useEffect(() => { selectedRef.current = selectedSggCode; }, [selectedSggCode]);
  useEffect(() => { selectedPartyColorRef.current = selectedPartyColor; }, [selectedPartyColor]);

  // ── 공통 스타일 헬퍼 ──────────────────────────────────────────
  const getIdleStyle = (isSido = false) => {
    const c = getColors();
    return {
      fillColor: c.idle, fillOpacity: c.idleOpacity,
      color: c.idleBorder, weight: isSido ? 2 : 1.2,
      cursor: 'pointer',
    };
  };

  // 지역구 idle 스타일: 정당색 있으면 연한 색, 없으면 기본 초록
  const getDistrictIdleStyle = (sgg?: string) => {
    const c = getColors();
    const pc = sgg ? partyMapRef.current.get(sgg) : undefined;
    if (pc) {
      return {
        fillColor: pc, fillOpacity: 0.28,
        color: c.idleBorder, weight: 1.2,
        cursor: 'pointer',
      };
    }
    return getIdleStyle(false);
  };

  const applyHover = (layer: any, isSido = false) => {
    const c = getColors();
    if (isSido) {
      layer.setStyle({ fillColor: c.hover, fillOpacity: 1, color: c.hoverBorder, weight: 2.5 });
    } else {
      const sgg = layer.feature?.properties?.SGG_Code;
      const pc = sgg ? partyMapRef.current.get(sgg) : undefined;
      if (pc) {
        layer.setStyle({ fillColor: pc, fillOpacity: 0.62, color: pc, weight: 1.8 });
      } else {
        layer.setStyle({ fillColor: c.hover, fillOpacity: 1, color: c.hoverBorder, weight: 1.8 });
      }
    }
    layer.bringToFront();
    layer.getElement?.()?.classList.add('district-hover');
  };

  const clearStyle = (layer: any, isSido = false) => {
    const c = getColors();
    const sgg = layer.feature?.properties?.SGG_Code;
    const isSel = !isSido && sgg && sgg === selectedRef.current;
    const pc = !isSido && sgg ? partyMapRef.current.get(sgg) : undefined;

    if (isSel) {
      layer.setStyle({
        fillColor: selectedPartyColorRef.current ?? pc ?? c.selected,
        fillOpacity: 0.88,
        color: c.selectedBorder,
        weight: 1.8,
      });
    } else if (pc) {
      layer.setStyle({
        fillColor: pc, fillOpacity: 0.28,
        color: c.idleBorder, weight: 1.2,
      });
    } else {
      layer.setStyle({
        fillColor: c.idle, fillOpacity: c.idleOpacity,
        color: c.idleBorder, weight: isSido ? 2 : 1.2,
      });
    }
    layer.getElement?.()?.classList.remove('district-hover');
    layer.closeTooltip();
  };

  // ── 시/도 레이어 빌드 ────────────────────────────────────────
  const buildSidoLayer = (L: any, geoJson: any, onSidoClick: (sido: string, sidoCode: string, bounds: any) => void) => {
    let hovered: any = null;
    return L.geoJSON(geoJson, {
      style: () => getIdleStyle(true),
      onEachFeature: (feature: any, lyr: any) => {
        const { sido, sidoCode } = feature.properties ?? {};
        lyr.bindTooltip(sido ?? '', { sticky: true, className: 'district-tooltip' });
        lyr.on('click', () => { if (sido && sidoCode) onSidoClick(sido, sidoCode, lyr.getBounds()); });
        lyr.on('mouseover', (e: any) => {
          if (hovered && hovered !== e.target) clearStyle(hovered, true);
          hovered = e.target; applyHover(e.target, true);
        });
        lyr.on('mouseout', (e: any) => {
          clearStyle(e.target, true);
          if (hovered === e.target) hovered = null;
        });
      },
    });
  };

  // ── 지역구 레이어 빌드 ────────────────────────────────────────
  const buildDistrictLayer = (L: any, geoJson: any) => {
    layerMapRef.current.clear();
    let hovered: any = null;
    return L.geoJSON(geoJson, {
      style: (feature: any) => {
        const sgg = feature?.properties?.SGG_Code;
        return getDistrictIdleStyle(sgg);
      },
      onEachFeature: (feature: any, lyr: any) => {
        const sggCode = feature.properties?.SGG_Code;
        const name = feature.properties?.SIDO_SGG || feature.properties?.SGG || '';
        lyr.bindTooltip(name, { sticky: true, className: 'district-tooltip' });
        if (sggCode) layerMapRef.current.set(sggCode, lyr);
        lyr.on('click', () => { if (sggCode) onDistrictSelect(sggCode); });
        lyr.on('mouseover', (e: any) => {
          if (hovered && hovered !== e.target) clearStyle(hovered);
          hovered = e.target; applyHover(e.target);
        });
        lyr.on('mouseout', (e: any) => {
          clearStyle(e.target);
          if (hovered === e.target) hovered = null;
        });
      },
    });
  };

  // ── 지역구 뷰로 전환 ─────────────────────────────────────────
  const showDistrictView = async (sido: string, sidoCode: string, bounds: any) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (bounds) map.fitBounds(bounds, { padding: [32, 48], maxZoom: 11, animate: true });

    // GeoJSON fetch (캐시 우선)
    const cachedGeoJson = distCacheRef.current.get(sidoCode);
    const geoJsonPromise: Promise<any> = cachedGeoJson
      ? Promise.resolve(cachedGeoJson)
      : fetch(`/data/districts/${sidoCode}.geojson`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => { distCacheRef.current.set(sidoCode, data); return data; });

    // 정당 데이터 fetch (GeoJSON과 독립적으로 병렬 진행)
    const membersPromise = memberApi.search({ sido });

    // GeoJSON 도착 즉시 레이어 교체 (정당색 없이 먼저 그림)
    let distGeoJson: any;
    try {
      distGeoJson = await geoJsonPromise;
    } catch {
      return;
    }

    sidoLayerRef.current?.remove();
    districtLayerRef.current?.remove();

    const layer = buildDistrictLayer(L, distGeoJson);
    layer.addTo(map);
    districtLayerRef.current = layer;

    viewModeRef.current = 'district';
    setViewMode('district');
    setActiveSido(sido);
    onViewModeChange?.('district', sido);
    setSelectSido(sidoCode);
    setSelectDistrict('');

    // 선거구 드롭다운 옵션 구성
    const opts: { name: string; sggCode: string }[] = distGeoJson.features
      .map((f: any) => ({ name: f.properties.SGG ?? f.properties.SIDO_SGG ?? '', sggCode: f.properties.SGG_Code ?? '' }))
      .filter((o: { name: string; sggCode: string }) => o.sggCode)
      .sort((a: { name: string; sggCode: string }, b: { name: string; sggCode: string }) => a.name.localeCompare(b.name, 'ko'));
    setDistrictOptions(opts);

    // 정당색 도착 후 기존 레이어에 in-place 적용 (레이어 재생성 없음)
    membersPromise.then(members => {
      // 다른 전환이 일어났다면 적용 무시
      if (districtLayerRef.current !== layer) return;

      const pm = new Map<string, string>();
      for (const m of members) {
        if (m.sggCode) pm.set(m.sggCode, getPartyColor(m.party));
      }
      partyMapRef.current = pm;

      const c = getColors();
      layer.eachLayer((lyr: any) => {
        const sgg = lyr.feature?.properties?.SGG_Code;
        if (!sgg) return;
        const pc = pm.get(sgg);
        const isSel = sgg === selectedRef.current;
        if (isSel) {
          lyr.setStyle({ fillColor: selectedPartyColorRef.current ?? pc ?? c.selected, fillOpacity: 0.88, color: c.selectedBorder, weight: 1.8 });
        } else if (pc) {
          lyr.setStyle({ fillColor: pc, fillOpacity: 0.28, color: c.idleBorder, weight: 1.2 });
        }
      });
    }).catch(() => {});
  };

  // ── 시/도 뷰로 전환 ──────────────────────────────────────────
  const showSidoView = async () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    districtLayerRef.current?.remove();
    districtLayerRef.current = null;
    layerMapRef.current.clear();
    prevSelectedRef.current = null;
    partyMapRef.current = new Map();

    const geoJson = sidoGeoJsonRef.current;
    if (!geoJson) return;

    const layer = buildSidoLayer(L, geoJson, showDistrictView);
    sidoLayerRef.current?.remove();
    layer.addTo(map);
    sidoLayerRef.current = layer;

    map.fitBounds(layer.getBounds(), { padding: [16, 32], maxZoom: 9, animate: true });
    viewModeRef.current = 'sido';
    setViewMode('sido');
    setActiveSido(null);
    setSelectSido('');
    setSelectDistrict('');
    setDistrictOptions([]);
    onViewModeChange?.('sido');
  };

  // ── 셀렉트: 시/도 선택 ───────────────────────────────────────
  const handleSidoSelect = async (sidoCode: string) => {
    setSelectSido(sidoCode);
    setSelectDistrict('');
    setDistrictOptions([]);
    if (!sidoCode) { await showSidoView(); return; }

    // sidoLayerRef에서 해당 sido 레이어의 bounds 찾기
    let bounds: any = null;
    let sidoName = '';
    sidoLayerRef.current?.eachLayer((lyr: any) => {
      if (lyr.feature?.properties?.sidoCode === sidoCode) {
        bounds = lyr.getBounds();
        sidoName = lyr.feature.properties.sido ?? '';
      }
    });

    // sido 레이어가 이미 제거된 경우 GeoJSON에서 직접 계산
    if (!bounds && sidoGeoJsonRef.current) {
      const feat = sidoGeoJsonRef.current.features.find(
        (f: any) => f.properties.sidoCode === sidoCode
      );
      if (feat) sidoName = feat.properties.sido ?? '';
    }

    await showDistrictView(sidoName, sidoCode, bounds);
  };

  // ── 셀렉트: 선거구 선택 ──────────────────────────────────────
  const handleDistrictSelect = (sggCode: string) => {
    setSelectDistrict(sggCode);
    if (sggCode) onDistrictSelect(sggCode);
  };

  // ── 지도 초기화 (마운트 1회) ─────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !mapContainerRef.current) return;
        LRef.current = L;

        const koreaBounds = L.latLngBounds([32.8, 124.5], [38.8, 132.0]);
        const map = L.map(mapContainerRef.current, {
          center: [36.3, 127.8], zoom: 7,
          zoomControl: true,
          maxBounds: koreaBounds, maxBoundsViscosity: 1.0,
          minZoom: 6, maxZoom: 13,
          boxZoom: false, zoomAnimationThreshold: 10,
        });
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
        sidoGeoJsonRef.current = sidoGeoJson;

        // 시/도 셀렉트 옵션 구성
        const opts: { name: string; code: string }[] = sidoGeoJson.features.map((f: any) => ({
          name: f.properties.sido,
          code: f.properties.sidoCode,
        }));
        setSidoOptions(opts);

        const sidoLayer = buildSidoLayer(L, sidoGeoJson, showDistrictView);
        sidoLayer.addTo(map);
        sidoLayerRef.current = sidoLayer;
        map.fitBounds(sidoLayer.getBounds(), { padding: [16, 32], maxZoom: 9, animate: true });

        setIsLoading(false);

        // sido 로딩 완료 후 모든 district GeoJSON 백그라운드 프리패치
        const prefetchOrder = [
          'seoul','gyeonggi','busan','incheon','daegu','daejeon',
          'gwangju','ulsan','sejong','gangwon','chungbuk','chungnam',
          'jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju',
        ];
        const prefetch = async () => {
          for (const code of prefetchOrder) {
            if (distCacheRef.current.has(code)) continue;
            try {
              const r = await fetch(`/data/districts/${code}.geojson`);
              if (r.ok) distCacheRef.current.set(code, await r.json());
            } catch { /* 무시 */ }
          }
        };
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => { prefetch(); });
        } else {
          setTimeout(() => { prefetch(); }, 300);
        }
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

  // ── 선택 지역구 강조 ─────────────────────────────────────────
  useEffect(() => {
    if (!districtLayerRef.current) return;
    const c = getColors();

    // 이전 선택 지역구 → idle(정당색 연하게) 복원
    if (prevSelectedRef.current) {
      const sgg = prevSelectedRef.current.feature?.properties?.SGG_Code;
      const pc = sgg ? partyMapRef.current.get(sgg) : undefined;
      prevSelectedRef.current.setStyle(
        pc
          ? { fillColor: pc, fillOpacity: 0.28, color: c.idleBorder, weight: 1.2 }
          : { fillColor: c.idle, fillOpacity: c.idleOpacity, color: c.idleBorder, weight: 1.2 }
      );
    }

    if (selectedSggCode) {
      const lyr = layerMapRef.current.get(selectedSggCode);
      if (lyr) {
        const pc = partyMapRef.current.get(selectedSggCode);
        const fillColor = selectedPartyColorRef.current ?? pc ?? c.selected;
        lyr.setStyle({ fillColor, fillOpacity: 0.88, color: c.selectedBorder, weight: 1.8 });
        prevSelectedRef.current = lyr;
      }
    } else {
      prevSelectedRef.current = null;
    }
  }, [selectedSggCode]);

  // ── 정당색 도착 시 선택 지역구 재스타일링 ────────────────────
  useEffect(() => {
    if (!prevSelectedRef.current || !selectedPartyColor) return;
    const c = getColors();
    prevSelectedRef.current.setStyle({
      fillColor: selectedPartyColor,
      fillOpacity: 0.88,
      color: c.selectedBorder,
      weight: 1.8,
    });
  }, [selectedPartyColor]);

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
            onClick={viewMode === 'district' ? showSidoView : undefined}
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

          {/* 시/도 셀렉트 */}
          <MapSelect
            value={selectSido}
            onChange={handleSidoSelect}
            placeholder="시/도 선택"
            options={sidoOptions.map(o => ({ label: o.name, value: o.code }))}
          />

          {/* 선거구 셀렉트 */}
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

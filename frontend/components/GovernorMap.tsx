'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LatLngBounds, Layer } from 'leaflet';
import { GovernorResponse, governorApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

export const SIDO_TO_SDNAME: Record<string, string> = {
  '서울': '서울특별시',
  '부산': '부산광역시',
  '대구': '대구광역시',
  '인천': '인천광역시',
  '광주': '광주광역시',
  '대전': '대전광역시',
  '울산': '울산광역시',
  '세종': '세종특별자치시',
  '경기': '경기도',
  '강원': '강원도',
  '충북': '충청북도',
  '충남': '충청남도',
  '전북': '전라북도',
  '전남': '전라남도',
  '경북': '경상북도',
  '경남': '경상남도',
  '제주': '제주특별자치도',
};

const SDNAME_TO_SIGUNGU_FILE: Record<string, string> = {
  '서울특별시': 'seoul',
  '부산광역시': 'busan',
  '대구광역시': 'daegu',
  '인천광역시': 'incheon',
  '광주광역시': 'gwangju',
  '대전광역시': 'daejeon',
  '울산광역시': 'ulsan',
  '세종특별자치시': 'sejong',
  '경기도': 'gyeonggi',
  '강원도': 'gangwon',
  '충청북도': 'chungbuk',
  '충청남도': 'chungnam',
  '전라북도': 'jeonbuk',
  '전라남도': 'jeonnam',
  '경상북도': 'gyeongbuk',
  '경상남도': 'gyeongnam',
  '제주특별자치도': 'jeju',
};

interface GovernorMapProps {
  onSidoClick: (sdName: string) => void;
  onSigunguClick?: (huboid: string) => void;
  selectedSdName?: string;
  isPanelOpen?: boolean;
}

export default function GovernorMap({ onSidoClick, onSigunguClick, selectedSdName, isPanelOpen }: GovernorMapProps) {
  const mapContainerRef    = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<LeafletMap | null>(null);
  const geoLayerRef        = useRef<LeafletGeoJSON | null>(null);
  const sigunguLayerRef    = useRef<LeafletGeoJSON | null>(null);
  const LRef               = useRef<any>(null);
  const bySdNameRef        = useRef<Map<string, GovernorResponse>>(new Map());
  const sidoBoundsRef      = useRef<Map<string, LatLngBounds>>(new Map());
  const onSidoClickRef     = useRef(onSidoClick);
  const onSigunguClickRef  = useRef(onSigunguClick);
  const selectedSdNameRef  = useRef(selectedSdName);

  useEffect(() => { onSidoClickRef.current = onSidoClick; }, [onSidoClick]);
  useEffect(() => { onSigunguClickRef.current = onSigunguClick; }, [onSigunguClick]);
  useEffect(() => { selectedSdNameRef.current = selectedSdName; }, [selectedSdName]);

  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [hoveredSido, setHoveredSido] = useState<string | null>(null);

  // 패널 열림에 따른 지도 패닝
  const prevPanelOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevPanelOpenRef.current;
    const isOpen  = isPanelOpen ?? false;
    prevPanelOpenRef.current = isOpen;

    const map = mapRef.current;
    if (!map || isOpen === wasOpen || window.innerWidth < 768) return;

    const offset = 440 / 2;
    map.panBy(isOpen ? [offset, 0] : [-offset, 0], { animate: true, duration: 0.28 });
    setTimeout(() => map.invalidateSize({ pan: false }), 320);
  }, [isPanelOpen]);

  // 선택된 시도로 줌인/줌아웃 + 나머지 레이어 숨김
  useEffect(() => {
    const map = mapRef.current;
    const layer = geoLayerRef.current;
    if (!map || !layer) return;

    if (selectedSdName) {
      // 선택된 시도만 표시, 나머지 숨김
      layer.eachLayer((l: Layer) => {
        const fl = l as any;
        const sido   = fl.feature?.properties?.sido as string;
        const sdName = SIDO_TO_SDNAME[sido];
        if (sdName !== selectedSdName) {
          fl.setStyle({ opacity: 0, fillOpacity: 0 });
        } else {
          fl.setStyle({ opacity: 0.8, fillOpacity: 0.70, fillColor: getPartyColor(bySdNameRef.current.get(sdName)?.party), color: '#fff', weight: 2 });
        }
      });
      const bounds = sidoBoundsRef.current.get(selectedSdName);
      if (bounds) map.fitBounds(bounds, { paddingTopLeft: [48, 16], paddingBottomRight: [16, 16], maxZoom: 10, animate: true });
    } else {
      // 전체 복원
      layer.eachLayer((l: Layer) => {
        const fl = l as any;
        const sido   = fl.feature?.properties?.sido as string;
        const sdName = SIDO_TO_SDNAME[sido];
        const gov    = sdName ? bySdNameRef.current.get(sdName) : undefined;
        fl.setStyle({ fillColor: getPartyColor(gov?.party), fillOpacity: 0.38, color: '#fff', weight: 1.5, opacity: 0.8 });
      });
      map.setView([36.3, 127.8], 7, { animate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSdName]);

  // 시도 선택 시 시군구 레이어 로드/해제
  useEffect(() => {
    if (sigunguLayerRef.current) {
      sigunguLayerRef.current.remove();
      sigunguLayerRef.current = null;
    }
    const map = mapRef.current;
    const L   = LRef.current;
    if (!selectedSdName || !map || !L) return;

    const file = SDNAME_TO_SIGUNGU_FILE[selectedSdName];
    if (!file) return;

    let cancelled = false;
    (async () => {
      try {
        const [sigunguGeo, distGovs] = await Promise.all([
          fetch(`/data/sigungu/${file}.geojson`).then(r => r.json()),
          governorApi.getDistrictGovernors(selectedSdName),
        ]);
        if (cancelled || !mapRef.current) return;

        const govByNm = new Map<string, GovernorResponse>();
        for (const g of distGovs) { if (g.sggName) govByNm.set(g.sggName, g); }
        const findGov = (nm: string) =>
          govByNm.get(nm) ??
          distGovs.find(g => g.sggName && nm.startsWith(g.sggName + ' '));

        const layer = L.geoJSON(sigunguGeo, {
          style: (feature: any) => {
            const gov = findGov(feature?.properties?.SIGUNGU_NM ?? '');
            return {
              fillColor: getPartyColor(gov?.party),
              fillOpacity: 0.65,
              color: '#fff',
              weight: 1.5,
              opacity: 0.9,
            };
          },
          onEachFeature: (feature: any, featureLayer: any) => {
            const nm  = (feature.properties?.SIGUNGU_NM ?? '') as string;
            const gov = findGov(nm);
            featureLayer.on({
              mouseover: (e: any) => {
                e.target.setStyle({ fillOpacity: 0.88, weight: 2.5 });
                e.target.bringToFront();
              },
              mouseout: (e: any) => { layer.resetStyle(e.target); },
              click: () => { if (gov?.huboid) onSigunguClickRef.current?.(gov.huboid); },
            });
            featureLayer.bindTooltip(
              gov
                ? `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;line-height:1.6">
                     <strong>${nm}</strong><br/>
                     <span style="color:#888">${gov.party ?? ''}</span> ${gov.name}
                   </div>`
                : `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">${nm}</div>`,
              { sticky: true, className: 'governor-tooltip', opacity: 0.95 },
            );
          },
        }).addTo(mapRef.current!);

        sigunguLayerRef.current = layer;
      } catch { /* 시군구 로드 실패 시 무시 */ }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSdName]);

  // 지도 초기화 (1회)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        LRef.current = L;
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !mapContainerRef.current) return;

        const koreaBounds = L.latLngBounds([31.5, 123.5], [39.5, 134.0]);
        const map = L.map(mapContainerRef.current, {
          center: [36.3, 127.8], zoom: 7,
          zoomControl: false,
          maxBounds: koreaBounds, maxBoundsViscosity: 1.0,
          minZoom: 6, maxZoom: 11,
          boxZoom: false,
        });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapRef.current = map;

        const setFilterPaused = (p: boolean) => {
          const pane = mapContainerRef.current?.querySelector('.leaflet-overlay-pane') as HTMLElement | null;
          pane?.classList.toggle('map-pane-paused', p);
        };
        map.on('zoomstart movestart', () => setFilterPaused(true));
        map.on('zoomend moveend',     () => setFilterPaused(false));

        const [sidoGeoJson, governors] = await Promise.all([
          fetch('/data/sido.geojson').then(r => r.json()),
          governorApi.getMetroMayors(),
        ]);
        if (cancelled) return;

        for (const g of governors) {
          if (g.sdName) bySdNameRef.current.set(g.sdName, g);
        }
        const byName = bySdNameRef.current;

        const getStyle = (sdName: string | undefined, isSelected: boolean, isHovered: boolean) => {
          const gov   = sdName ? byName.get(sdName) : undefined;
          const color = getPartyColor(gov?.party);
          return {
            fillColor: color,
            fillOpacity: isSelected ? 0.80 : isHovered ? 0.60 : 0.38,
            color: '#fff',
            weight: isSelected ? 2.5 : 1.5,
            opacity: 0.8,
          };
        };

        const layer = L.geoJSON(sidoGeoJson, {
          style: (feature) => {
            const sdName = SIDO_TO_SDNAME[feature?.properties?.sido as string];
            return getStyle(sdName, false, false);
          },
          onEachFeature: (feature, featureLayer) => {
            const sido   = feature.properties?.sido as string;
            const sdName = SIDO_TO_SDNAME[sido];
            const gov    = sdName ? byName.get(sdName) : undefined;

            // 시도별 bounds 저장 (줌인에 사용)
            const bounds = (featureLayer as any).getBounds?.() as LatLngBounds | undefined;
            if (sdName && bounds) sidoBoundsRef.current.set(sdName, bounds);

            const getTooltipContent = () => gov
              ? `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;line-height:1.6">
                   <strong>${sido}</strong><br/>
                   <span style="color:#888">${gov.party ?? ''}</span> ${gov.name}
                 </div>`
              : `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">${sido}</div>`;

            featureLayer.on({
              mouseover: (e) => {
                setHoveredSido(sido);
                (featureLayer as any).setTooltipContent(getTooltipContent());
                if (!selectedSdNameRef.current) {
                  (e.target as any).setStyle(getStyle(sdName, false, true));
                  (e.target as any).bringToFront();
                }
              },
              mouseout: () => {
                setHoveredSido(null);
                if (!selectedSdNameRef.current) {
                  (featureLayer as any).setStyle(getStyle(sdName, false, false));
                }
              },
              click: () => {
                if (sdName) onSidoClickRef.current(sdName);
              },
            });

            featureLayer.bindTooltip(getTooltipContent(), {
              sticky: true,
              className: 'governor-tooltip',
              opacity: 0.95,
            });
          },
        }).addTo(map);

        geoLayerRef.current = layer;
        setIsLoading(false);
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

  // hover 변경 시 레이어 스타일 갱신 (선택된 시도가 없을 때만)
  useEffect(() => {
    const layer = geoLayerRef.current;
    if (!layer || selectedSdName) return;
    layer.eachLayer((l: any) => {
      const sido   = l.feature?.properties?.sido as string;
      const sdName = SIDO_TO_SDNAME[sido];
      const gov    = sdName ? bySdNameRef.current.get(sdName) : undefined;
      const color  = getPartyColor(gov?.party);
      const isHovered = sido === hoveredSido;
      l.setStyle({
        fillColor: color,
        fillOpacity: isHovered ? 0.60 : 0.38,
        color: '#fff',
        weight: 1.5,
        opacity: 0.8,
      });
    });
  }, [selectedSdName, hoveredSido]);

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
      <div ref={mapContainerRef} className="w-full h-full" style={{ background: 'var(--color-map-bg)' }} />
    </div>
  );
}

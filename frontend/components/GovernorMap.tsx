'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';
import { GovernorResponse, governorApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

// sido.geojson 의 sido 단축명 → 선관위 sdName 전체명 매핑 (2022 기준)
const SIDO_TO_SDNAME: Record<string, string> = {
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

interface GovernorMapProps {
  onGovernorSelect: (huboid: string) => void;
  selectedHuboid?: string;
  isPanelOpen?: boolean;
}

export default function GovernorMap({ onGovernorSelect, selectedHuboid, isPanelOpen }: GovernorMapProps) {
  const mapContainerRef  = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<LeafletMap | null>(null);
  const geoLayerRef      = useRef<LeafletGeoJSON | null>(null);
  const byHuboidRef      = useRef<Map<string, GovernorResponse>>(new Map());
  const bySdNameRef      = useRef<Map<string, GovernorResponse>>(new Map());

  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [hoveredSido, setHoveredSido] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
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
          byHuboidRef.current.set(g.huboid, g);
          if (g.sdName) bySdNameRef.current.set(g.sdName, g);
        }
        const byName = bySdNameRef.current;

        const styleFeature = (sido: string, isSelected: boolean, isHovered: boolean) => {
          const sdName = SIDO_TO_SDNAME[sido];
          const gov    = sdName ? byName.get(sdName) : undefined;
          const color  = getPartyColor(gov?.party);
          return {
            fillColor: color,
            fillOpacity: isSelected ? 0.75 : isHovered ? 0.55 : 0.35,
            color: '#fff',
            weight: isSelected ? 2.5 : 1.5,
            opacity: 0.8,
          };
        };

        const layer = L.geoJSON(sidoGeoJson, {
          style: (feature) => {
            const sido = feature?.properties?.sido as string;
            return styleFeature(sido, false, false);
          },
          onEachFeature: (feature, featureLayer) => {
            const sido   = feature.properties?.sido as string;
            const sdName = SIDO_TO_SDNAME[sido];
            const gov    = sdName ? byName.get(sdName) : undefined;

            featureLayer.on({
              mouseover: (e) => {
                setHoveredSido(sido);
                (e.target as any).setStyle(styleFeature(sido, gov?.huboid === selectedHuboid, true));
                (e.target as any).bringToFront();
              },
              mouseout: (e) => {
                setHoveredSido(null);
                (e.target as any).setStyle(styleFeature(sido, gov?.huboid === selectedHuboid, false));
              },
              click: () => {
                if (gov) onGovernorSelect(gov.huboid);
              },
            });

            const tooltipContent = gov
              ? `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;line-height:1.5">
                   <strong>${sido}</strong><br/>
                   <span style="color:#555">${gov.party ?? ''}</span> ${gov.name}
                 </div>`
              : `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px">${sido}</div>`;

            featureLayer.bindTooltip(tooltipContent, {
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

  // 선택 상태 변경 시 레이어 스타일 갱신
  useEffect(() => {
    const layer = geoLayerRef.current;
    if (!layer) return;
    layer.eachLayer((l: any) => {
      const sido   = l.feature?.properties?.sido as string;
      const sdName = SIDO_TO_SDNAME[sido];
      const gov    = sdName ? bySdNameRef.current.get(sdName) : undefined;
      const isSelected = gov?.huboid === selectedHuboid;
      const isHovered  = sido === hoveredSido;
      const color = getPartyColor(gov?.party);
      l.setStyle({
        fillColor: color,
        fillOpacity: isSelected ? 0.75 : isHovered ? 0.55 : 0.35,
        color: '#fff',
        weight: isSelected ? 2.5 : 1.5,
        opacity: 0.8,
      });
    });
  }, [selectedHuboid, hoveredSido]);

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

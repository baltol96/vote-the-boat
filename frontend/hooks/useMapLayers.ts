import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';
import { memberApi } from '@/lib/api';
import { getPartyColor } from '@/lib/constants';

export type MapViewMode = 'sido' | 'district';

// ── 색상 팔레트 ──────────────────────────────────────────────────
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

export interface UseMapLayersParams {
  mapRef: React.MutableRefObject<LeafletMap | null>;
  LRef: React.MutableRefObject<any>;
  isPanelOpenRef: React.MutableRefObject<boolean>;
  onDistrictSelect: (sggCode: string) => void;
  onViewModeChange?: (mode: MapViewMode, selectedSido?: string) => void;
  selectedSggCode?: string;
  selectedPartyColor?: string;
}

export interface UseMapLayersReturn {
  viewMode: MapViewMode;
  activeSido: string | null;
  sidoOptions: { name: string; code: string }[];
  districtOptions: { name: string; sggCode: string }[];
  selectSido: string;
  selectDistrict: string;
  districtLoading: boolean;
  handleSidoSelect: (sidoCode: string) => Promise<void>;
  handleDistrictSelect: (sggCode: string) => void;
  initSidoLayer: (L: any, sidoGeoJson: any) => void;
  prefetchDistricts: (codes: string[]) => void;
  viewModeRef: React.MutableRefObject<MapViewMode>;
}

export function useMapLayers({
  mapRef,
  LRef,
  isPanelOpenRef,
  onDistrictSelect,
  onViewModeChange,
  selectedSggCode,
  selectedPartyColor,
}: UseMapLayersParams): UseMapLayersReturn {
  // ── 레이어 refs ───────────────────────────────────────────────
  const sidoGeoJsonRef       = useRef<any>(null);
  const sidoLayerRef         = useRef<LeafletGeoJSON | null>(null);
  const districtLayerRef     = useRef<LeafletGeoJSON | null>(null);
  const selectedRef          = useRef(selectedSggCode);
  const layerMapRef          = useRef<Map<string, any>>(new Map());
  const prevSelectedRef      = useRef<any>(null);
  const selectedPartyColorRef = useRef<string | undefined>(undefined);
  const distCacheRef         = useRef<Map<string, any>>(new Map());
  const viewModeRef          = useRef<MapViewMode>('sido');
  const partyMapRef          = useRef<Map<string, string>>(new Map());

  // ── 뷰 상태 ───────────────────────────────────────────────────
  const [viewMode, setViewMode]             = useState<MapViewMode>('sido');
  const [activeSido, setActiveSido]         = useState<string | null>(null);
  const [sidoOptions, setSidoOptions]       = useState<{ name: string; code: string }[]>([]);
  const [districtOptions, setDistrictOptions] = useState<{ name: string; sggCode: string }[]>([]);
  const [selectSido, setSelectSido]         = useState('');
  const [selectDistrict, setSelectDistrict] = useState('');
  const [districtLoading, setDistrictLoading] = useState(false);

  useEffect(() => { selectedRef.current = selectedSggCode; }, [selectedSggCode]);
  useEffect(() => { selectedPartyColorRef.current = selectedPartyColor; }, [selectedPartyColor]);

  // ── 스타일 헬퍼 ──────────────────────────────────────────────
  const getIdleStyle = (isSido = false) => {
    const c = getColors();
    return {
      fillColor: c.idle, fillOpacity: c.idleOpacity,
      color: c.idleBorder, weight: isSido ? 2 : 1.2,
      cursor: 'pointer',
    };
  };

  const getDistrictIdleStyle = (sgg?: string) => {
    const c = getColors();
    const pc = sgg ? partyMapRef.current.get(sgg) : undefined;
    if (pc) {
      return { fillColor: pc, fillOpacity: 0.28, color: c.idleBorder, weight: 1.2, cursor: 'pointer' };
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
      layer.setStyle({ fillColor: pc, fillOpacity: 0.28, color: c.idleBorder, weight: 1.2 });
    } else {
      layer.setStyle({
        fillColor: c.idle, fillOpacity: c.idleOpacity,
        color: c.idleBorder, weight: isSido ? 2 : 1.2,
      });
    }
    layer.getElement?.()?.classList.remove('district-hover');
    layer.closeTooltip();
  };

  // ── 레이어 빌더 ───────────────────────────────────────────────
  const buildSidoLayer = useCallback((
    L: any,
    geoJson: any,
    onSidoClick: (sido: string, sidoCode: string, bounds: any) => void,
  ) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDistrictLayer = useCallback((L: any, geoJson: any) => {
    layerMapRef.current.clear();
    let hovered: any = null;
    return L.geoJSON(geoJson, {
      style: (feature: any) => getDistrictIdleStyle(feature?.properties?.SGG_Code),
      onEachFeature: (feature: any, lyr: any) => {
        const sggCode = feature.properties?.SGG_Code;
        const name = feature.properties?.SIDO_SGG || feature.properties?.SGG || '';
        lyr.bindTooltip(name, { sticky: true, className: 'district-tooltip' });
        if (sggCode) layerMapRef.current.set(sggCode, lyr);
        lyr.on('click', () => { if (sggCode) { setSelectDistrict(sggCode); onDistrictSelect(sggCode); } });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDistrictSelect]);

  // ── 지역구 뷰 전환 ───────────────────────────────────────────
  const showDistrictView = useCallback(async (sido: string, sidoCode: string, bounds: any) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (bounds) {
      const panelOpen = isPanelOpenRef.current && window.innerWidth >= 768;
      const fitOpts = panelOpen
        ? { paddingTopLeft: [48, 32] as [number, number], paddingBottomRight: [488, 32] as [number, number], maxZoom: 11, animate: true }
        : { padding: [32, 48] as [number, number], maxZoom: 11, animate: true };
      map.fitBounds(bounds, fitOpts);
    }

    const cachedGeoJson = distCacheRef.current.get(sidoCode);
    const geoJsonPromise: Promise<any> = cachedGeoJson
      ? Promise.resolve(cachedGeoJson)
      : fetch(`/data/districts/${sidoCode}.geojson`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => { distCacheRef.current.set(sidoCode, data); return data; });

    const membersPromise = memberApi.search({ sido });

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

    const opts: { name: string; sggCode: string }[] = distGeoJson.features
      .map((f: any) => ({ name: f.properties.SGG ?? f.properties.SIDO_SGG ?? '', sggCode: f.properties.SGG_Code ?? '' }))
      .filter((o: { name: string; sggCode: string }) => o.sggCode)
      .sort((a: { name: string; sggCode: string }, b: { name: string; sggCode: string }) =>
        a.name.localeCompare(b.name, 'ko'));
    setDistrictOptions(opts);

    membersPromise.then(members => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildDistrictLayer, onViewModeChange]);

  // ── 시/도 뷰 전환 ────────────────────────────────────────────
  const showSidoView = useCallback(async () => {
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

    map.fitBounds(layer.getBounds(), { paddingTopLeft: [48, 16] as [number, number], paddingBottomRight: [16, 16] as [number, number], maxZoom: 9, animate: true });
    viewModeRef.current = 'sido';
    setViewMode('sido');
    setActiveSido(null);
    setSelectSido('');
    setSelectDistrict('');
    setDistrictOptions([]);
    onViewModeChange?.('sido');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildSidoLayer, showDistrictView, onViewModeChange]);

  // ── 셀렉트 핸들러 ────────────────────────────────────────────
  const handleSidoSelect = useCallback(async (sidoCode: string) => {
    setSelectSido(sidoCode);
    setSelectDistrict('');
    setDistrictOptions([]);
    if (!sidoCode) { await showSidoView(); return; }

    let bounds: any = null;
    let sidoName = '';
    sidoLayerRef.current?.eachLayer((lyr: any) => {
      if (lyr.feature?.properties?.sidoCode === sidoCode) {
        bounds = lyr.getBounds();
        sidoName = lyr.feature.properties.sido ?? '';
      }
    });

    if (!bounds && sidoGeoJsonRef.current) {
      const feat = sidoGeoJsonRef.current.features.find(
        (f: any) => f.properties.sidoCode === sidoCode,
      );
      if (feat) sidoName = feat.properties.sido ?? '';
    }

    await showDistrictView(sidoName, sidoCode, bounds);
  }, [showSidoView, showDistrictView]);

  const handleDistrictSelect = useCallback((sggCode: string) => {
    setSelectDistrict(sggCode);
    if (sggCode) onDistrictSelect(sggCode);
  }, [onDistrictSelect]);

  // ── 백그라운드 프리패치 ───────────────────────────────────────
  const prefetchDistricts = useCallback((codes: string[]) => {
    const run = async () => {
      for (const code of codes) {
        if (distCacheRef.current.has(code)) continue;
        try {
          const r = await fetch(`/data/districts/${code}.geojson`);
          if (r.ok) distCacheRef.current.set(code, await r.json());
        } catch { /* 무시 */ }
      }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => { run(); });
    } else {
      setTimeout(() => { run(); }, 300);
    }
  }, []);

  // ── 시/도 레이어 초기화 (Leaflet init 완료 후 1회 호출) ──────
  const initSidoLayer = useCallback((L: any, sidoGeoJson: any) => {
    sidoGeoJsonRef.current = sidoGeoJson;
    const opts = sidoGeoJson.features.map((f: any) => ({
      name: f.properties.sido,
      code: f.properties.sidoCode,
    }));
    setSidoOptions(opts);

    const layer = buildSidoLayer(L, sidoGeoJson, showDistrictView);
    layer.addTo(mapRef.current!);
    sidoLayerRef.current = layer;
    mapRef.current!.fitBounds(layer.getBounds(), { paddingTopLeft: [48, 16] as [number, number], paddingBottomRight: [16, 16] as [number, number], maxZoom: 9, animate: true });
  }, [buildSidoLayer, showDistrictView]);

  // ── 선택 지역구 강조 ─────────────────────────────────────────
  useEffect(() => {
    if (!districtLayerRef.current) return;
    const c = getColors();

    if (prevSelectedRef.current) {
      const sgg = prevSelectedRef.current.feature?.properties?.SGG_Code;
      const pc = sgg ? partyMapRef.current.get(sgg) : undefined;
      prevSelectedRef.current.setStyle(
        pc
          ? { fillColor: pc, fillOpacity: 0.28, color: c.idleBorder, weight: 1.2 }
          : { fillColor: c.idle, fillOpacity: c.idleOpacity, color: c.idleBorder, weight: 1.2 },
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
      setSelectDistrict('');
    }
  }, [selectedSggCode]);

  // ── 정당색 도착 시 선택 지역구 재스타일링 ─────────────────────
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

  return {
    viewMode,
    activeSido,
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
  };
}

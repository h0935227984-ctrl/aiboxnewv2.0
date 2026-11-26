(function (root, factory) {
  const api = factory();
  root.AiboxMapLogic = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // 台北信義區主幹道實景巡航環線 (市府路 -> 忠孝東路五段 -> 松仁路 -> 信義路五段)
  const DEMO_ROUTE = [
    { lat: 25.033080, lng: 121.563680, name: '信義路五段 × 市府路口' },
    { lat: 25.036120, lng: 121.563680, name: '市府路 · 市民廣場前' },
    { lat: 25.040820, lng: 121.563680, name: '市府路 × 忠孝東路五段' },
    { lat: 25.040820, lng: 121.566150, name: '忠孝東路五段 · 市政府站' },
    { lat: 25.040820, lng: 121.568550, name: '忠孝東路五段 × 松仁路口' },
    { lat: 25.036120, lng: 121.568550, name: '松仁路 · 信義計畫區' },
    { lat: 25.033080, lng: 121.568550, name: '松仁路 × 信義路五段' },
    { lat: 25.033080, lng: 121.565600, name: '信義路五段 · 台北 101 前' }
  ];

  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;
  const EARTH_RADIUS_M = 6371000;

  function haversineMeters(a, b) {
    const dLat = (b.lat - a.lat) * DEG_TO_RAD;
    const dLng = (b.lng - a.lng) * DEG_TO_RAD;
    const lat1 = a.lat * DEG_TO_RAD;
    const lat2 = b.lat * DEG_TO_RAD;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function computeBearingDeg(a, b) {
    const lat1 = a.lat * DEG_TO_RAD;
    const lat2 = b.lat * DEG_TO_RAD;
    const dLng = (b.lng - a.lng) * DEG_TO_RAD;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
  }

  function normalizeAngleDiffDeg(targetDeg, currentDeg) {
    let diff = ((targetDeg - currentDeg + 540) % 360) - 180;
    if (diff < -180) diff += 360;
    return diff;
  }

  const segments = [];
  let totalLoopMeters = 0;
  for (let i = 0; i < DEMO_ROUTE.length; i++) {
    const start = DEMO_ROUTE[i];
    const end = DEMO_ROUTE[(i + 1) % DEMO_ROUTE.length];
    const lengthMeters = Math.max(1, haversineMeters(start, end));
    const bearingDeg = computeBearingDeg(start, end);
    segments.push({
      start,
      end,
      lengthMeters,
      bearingDeg,
      cumulativeStart: totalLoopMeters,
      name: start.name,
    });
    totalLoopMeters += lengthMeters;
  }

  function sampleRouteAtDistance(distanceMeters) {
    let d = ((distanceMeters % totalLoopMeters) + totalLoopMeters) % totalLoopMeters;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (d <= seg.cumulativeStart + seg.lengthMeters || i === segments.length - 1) {
        const local = Math.max(0, d - seg.cumulativeStart);
        const t = Math.min(1, local / seg.lengthMeters);
        const nextSeg = segments[(i + 1) % segments.length];

        // 接近路口最後 25 公尺預先平滑轉向
        const remainMeters = seg.lengthMeters - local;
        let bearingDeg = seg.bearingDeg;
        let curvature = 0;
        if (remainMeters < 25) {
          const turnDiff = normalizeAngleDiffDeg(nextSeg.bearingDeg, seg.bearingDeg);
          const blend = (25 - remainMeters) / 25;
          bearingDeg = (seg.bearingDeg + turnDiff * blend * 0.5 + 360) % 360;
          curvature = Math.max(-1.3, Math.min(1.3, (turnDiff / 90) * 1.15));
        }

        return {
          lat: seg.start.lat + (seg.end.lat - seg.start.lat) * t,
          lng: seg.start.lng + (seg.end.lng - seg.start.lng) * t,
          bearingDeg,
          curvature,
          segmentName: seg.name,
          progressMeters: d,
        };
      }
    }
    return {
      lat: DEMO_ROUTE[0].lat,
      lng: DEMO_ROUTE[0].lng,
      bearingDeg: segments[0].bearingDeg,
      curvature: 0,
      segmentName: DEMO_ROUTE[0].name,
      progressMeters: 0,
    };
  }

  function stepDemoRoute(progressMeters, speedMps, dtSec) {
    const nextMeters = (progressMeters || 0) + Math.max(0, speedMps || 0) * Math.max(0, dtSec || 0);
    return sampleRouteAtDistance(nextMeters);
  }

  /**
   * 依車輛實際寬度與地圖縮放層級，計算貼合車道寬度 (~1.48m 車寬，留餘裕於 3.2m 車道內) 的 3D 縮放倍率
   */
  function computeLaneMatchedCarScale(carWidthUnits, zoomLevel) {
    const safeWidth = Math.max(0.6, Number(carWidthUnits) || 1.28);
    const targetStreetWidthMeters = 1.48;
    const baseScale = targetStreetWidthMeters / safeWidth;
    const z = Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : 18.8;
    const zoomOutDelta = Math.max(0, 18.8 - z);
    const adaptiveBoost = Math.pow(2, Math.min(4.0, zoomOutDelta) * 0.42);
    return baseScale * adaptiveBoost;
  }

  /**
   * 判斷地圖拖曳或雙指縮放手勢是否應暫停跟隨車輛：
   * - 雙指縮放／剛發生縮放變化時，必須維持跟隨，避免縮放中斷跟車
   * - 單指拖曳才暫停跟隨（模擬試駕模式下可設定自動恢復跟隨）
   */
  function shouldKeepFollowingOnDrag(opts) {
    const o = opts || {};
    if (o.isProgrammatic) return true;
    if ((Number(o.activePointers) || 0) >= 2) return true;
    const nowMs = Number(o.nowMs) || 0;
    const lastZoomMs = Number(o.lastZoomMs) || 0;
    if (lastZoomMs > 0 && nowMs - lastZoomMs < 450) return true;
    return false;
  }

  /**
   * 3D 跟隨視角前瞻偏移：將地圖中心沿車頭方向往前推進，讓車身位於畫面中下方，展現立體 3D 前方路景
   */
  function computeLookAheadCenter(lat, lng, headingDeg, zoomLevel) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return { lat: 25.033080, lng: 121.563680 };
    }
    const z = Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : 20.3;
    const latRad = latNum * DEG_TO_RAD;
    const metersPerPx = (156543.03392 * Math.cos(latRad)) / Math.pow(2, z);
    const aheadMeters = Math.max(10, Math.min(220, (68 * metersPerPx) / 0.42));
    const rad = (Number(headingDeg) || 0) * DEG_TO_RAD;
    const dNorth = aheadMeters * Math.cos(rad);
    const dEast = aheadMeters * Math.sin(rad);
    const dLat = (dNorth / EARTH_RADIUS_M) * RAD_TO_DEG;
    const cosLat = Math.max(0.15, Math.cos(latRad));
    const dLng = (dEast / (EARTH_RADIUS_M * cosLat)) * RAD_TO_DEG;
    return {
      lat: latNum + dLat,
      lng: lngNum + dLng,
    };
  }

  return {
    DEMO_ROUTE,
    totalLoopMeters,
    haversineMeters,
    computeBearingDeg,
    normalizeAngleDiffDeg,
    sampleRouteAtDistance,
    stepDemoRoute,
    computeLaneMatchedCarScale,
    shouldKeepFollowingOnDrag,
    computeLookAheadCenter,
  };
});

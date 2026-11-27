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
   * 依車輛實際寬度與地圖縮放層級，計算適配道路與導航可視度的 3D 模型縮放倍率。
   * 放大車輛比例，讓車身在 17.0 縮放層級下清晰可辨（長寬高清晰、車輪與車頂立體）。
   */
  function computeLaneMatchedCarScale(carWidthUnits, zoomLevel) {
    const safeWidth = Math.max(0.6, Number(carWidthUnits) || 1.28);
    // 基準目標車寬設定為 4.6 米（原先 1.48 米過小導致車模變成米粒般微小）
    const targetCarWidthMeters = 4.6;
    const baseScale = targetCarWidthMeters / safeWidth;
    const z = Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : 17.0;
    // 當縮小至 17.0 以下時提供平滑動態自適應補償，防止車模隨地圖縮小而消失
    const zoomOutDelta = Math.max(0, 18.0 - z);
    const adaptiveBoost = Math.pow(2, Math.min(4.5, zoomOutDelta) * 0.45);
    return baseScale * adaptiveBoost;
  }

  /**
   * 3D 跟隨視角前瞻偏移：將地圖中心沿車頭方向往前推進，讓車身位於畫面中下方，展現立體前方路景。
   * 基準層級對齊 17.0。
   */
  function computeLookAheadCenter(lat, lng, headingDeg, zoomLevel) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return { lat: 25.033080, lng: 121.563680 };
    }
    const z = Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : 17.0;
    const latRad = latNum * DEG_TO_RAD;
    const metersPerPx = (156543.03392 * Math.cos(latRad)) / Math.pow(2, z);
    const aheadMeters = Math.max(15, Math.min(380, (65 * metersPerPx) / 0.42));
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

  /**
   * 道路貼齊與防建築物偏移濾波引擎 (Road Snapping & Anti-Building Drift Tracker)：
   * 1. 結合 Google Roads API (nearestRoads) 自動吸附至官方道路中心線。
   * 2. 車輛行進中時，將位置沿行駛切線投影，強制抑制垂直於路面的橫向跳動（防止 GPS 漂移撞入建築物屋頂）。
   * 3. 橫向偏差嚴格限制在一般路寬安全裕度內 (<= 4.5m)。
   */
  function createRoadTracker() {
    let currentLat = null;
    let currentLng = null;
    let currentHeading = 0;
    let lastRoadQueryMs = 0;
    let inFlight = false;
    let snappedRoadPlaceId = null;

    async function queryGoogleNearestRoad(lat, lng, apiKey) {
      if (!apiKey || inFlight) return null;
      inFlight = true;
      try {
        const url = 'https://roads.googleapis.com/v1/nearestRoads?points=' + lat + ',' + lng + '&key=' + encodeURIComponent(apiKey);
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data && data.snappedPoints && data.snappedPoints.length > 0) {
          const pt = data.snappedPoints[0];
          return {
            lat: pt.location.latitude,
            lng: pt.location.longitude,
            placeId: pt.placeId || null
          };
        }
      } catch (_) {
        return null;
      } finally {
        inFlight = false;
      }
      return null;
    }

    function feedRawGps(lat, lng, speedKmh, bearingDeg, timestampMs, apiKey) {
      const rawLat = Number(lat);
      const rawLng = Number(lng);
      const speed = Math.max(0, Number(speedKmh) || 0);
      const heading = (Number(bearingDeg) >= 0) ? ((Number(bearingDeg) % 360) + 360) % 360 : currentHeading;

      if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
        return { lat: currentLat, lng: currentLng, headingDeg: currentHeading, snapped: false };
      }

      const now = Number(timestampMs) || performance.now();

      // 初次啟動或未有歷史位置
      if (currentLat === null || currentLng === null) {
        currentLat = rawLat;
        currentLng = rawLng;
        currentHeading = heading;
        if (apiKey) {
          queryGoogleNearestRoad(rawLat, rawLng, apiKey).then(res => {
            if (res) {
              currentLat = res.lat;
              currentLng = res.lng;
              snappedRoadPlaceId = res.placeId;
            }
          });
        }
        return { lat: currentLat, lng: currentLng, headingDeg: currentHeading, snapped: true };
      }

      // 車速極低（怠速/停車）時，鎖定微幅抖動，防止 GPS 在停車時漂移進建築物
      if (speed < 1.5) {
        const driftDist = haversineMeters({ lat: currentLat, lng: currentLng }, { lat: rawLat, lng: rawLng });
        if (driftDist < 7.0) {
          return { lat: currentLat, lng: currentLng, headingDeg: currentHeading, snapped: true };
        }
      }

      // 投影計算：分解沿路方向（縱向）與兩側建築方向（橫向）
      const latRad = currentLat * DEG_TO_RAD;
      const cosLat = Math.max(0.15, Math.cos(latRad));
      const dNorth = (rawLat - currentLat) * DEG_TO_RAD * EARTH_RADIUS_M;
      const dEast = (rawLng - currentLng) * DEG_TO_RAD * EARTH_RADIUS_M * cosLat;
      const stepDist = Math.hypot(dNorth, dEast);

      const rad = heading * DEG_TO_RAD;
      const uNorth = Math.cos(rad);
      const uEast = Math.sin(rad);

      // 縱向移動（沿車道正向）
      const longMeters = dNorth * uNorth + dEast * uEast;
      // 橫向偏移（偏離車道往路旁建築物）
      const latNorth = dNorth - longMeters * uNorth;
      const latEast = dEast - longMeters * uEast;
      const latDist = Math.hypot(latNorth, latEast);

      // 嚴格限制橫向偏移量：大馬路單側車道極限為 4.5m，防止 GPS 偏擺上兩側騎樓與建築物
      const maxLateralM = speed > 8 ? 3.8 : 5.5;
      let safeLatNorth = latNorth;
      let safeLatEast = latEast;
      if (latDist > maxLateralM) {
        const factor = maxLateralM / latDist;
        safeLatNorth *= factor;
        safeLatEast *= factor;
      }

      // 縱向步長平滑過濾（防止瞬時暴衝）
      const maxLongM = Math.max(6.0, (speed / 3.6) * 1.8);
      const safeLongM = Math.max(-2.0, Math.min(maxLongM, longMeters));

      const finalNorth = safeLongM * uNorth + safeLatNorth * 0.4;
      const finalEast = safeLongM * uEast + safeLatEast * 0.4;

      currentLat += (finalNorth / EARTH_RADIUS_M) * RAD_TO_DEG;
      currentLng += (finalEast / (EARTH_RADIUS_M * cosLat)) * RAD_TO_DEG;
      currentHeading = heading;

      // 定期向 Google Roads API 查詢精確路網吸附
      if (apiKey && (now - lastRoadQueryMs > 1800) && (speed > 2.0 || stepDist > 12)) {
        lastRoadQueryMs = now;
        queryGoogleNearestRoad(rawLat, rawLng, apiKey).then(res => {
          if (res) {
            const roadDist = haversineMeters({ lat: currentLat, lng: currentLng }, res);
            if (roadDist < 35.0) {
              // 柔和過渡至道路中心線
              currentLat = currentLat * 0.4 + res.lat * 0.6;
              currentLng = currentLng * 0.4 + res.lng * 0.6;
              snappedRoadPlaceId = res.placeId;
            }
          }
        });
      }

      return {
        lat: currentLat,
        lng: currentLng,
        headingDeg: currentHeading,
        snapped: true
      };
    }

    function reset(lat, lng, headingDeg) {
      currentLat = Number.isFinite(Number(lat)) ? Number(lat) : null;
      currentLng = Number.isFinite(Number(lng)) ? Number(lng) : null;
      if (Number.isFinite(Number(headingDeg))) currentHeading = Number(headingDeg);
    }

    return {
      feedRawGps,
      reset,
      getCurrent: () => ({ lat: currentLat, lng: currentLng, headingDeg: currentHeading })
    };
  }

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
   * 計算動態煞車燈狀態與車身俯仰慣性 (無須 OBD/CAN，依據 GPS 速度變化量或靜止判斷)
   */
  function computeBrakeState(currentSpeedKmh, prevSpeedKmh, dtSec) {
    const dt = Math.max(0.001, Number(dtSec) || 0.016);
    const curSpeed = Math.max(0, Number(currentSpeedKmh) || 0);
    const prevSpeed = Math.max(0, Number(prevSpeedKmh) || 0);
    const accel = (curSpeed - prevSpeed) / dt; // km/h/s

    // 減速門檻：減速度小於 -3.2 km/h/s (強烈或中度踩煞車) 或 車速低於 1.0 km/h (停等怠速踩著煞車)
    const isDeceleratingHard = accel < -3.2 && curSpeed > 1.5;
    const isStationaryBraking = curSpeed < 1.0;
    const isBraking = isDeceleratingHard || isStationaryBraking;

    let brakeIntensity = 0.0;
    if (isStationaryBraking) {
      brakeIntensity = 1.0;
    } else if (isDeceleratingHard) {
      brakeIntensity = Math.min(1.0, Math.max(0.4, (-accel - 3.2) / 8.8 * 0.6 + 0.4));
    } else if (accel < -1.2 && curSpeed > 3.0) {
      brakeIntensity = 0.15;
    }

    // 車身動態俯仰 (前傾點頭 / 後仰抬頭)
    const pitchRad = Math.max(-0.065, Math.min(0.045, -accel * 0.0022));

    return {
      accelKmhPerSec: accel,
      isBraking,
      brakeIntensity,
      pitchRad
    };
  }

  /**
   * 停等紅燈 15 秒電影級展廳環視控制器 (Anti-Occlusion Showroom Controller)
   * 1. 靜止持續超過 15 秒自動啟動 360° 緩慢環視
   * 2. 防 3D 建築遮擋算法 (Anti-Occlusion)：
   *    - 俯仰角從平視 67.5° 抬高至 38.5° 高空路峽視角（垂直俯瞰），視線由天空切向路面，避免橫向旋轉切入沿街建築物
   *    - 縮放微調收攏 (19.1 -> 19.45)，將視距收斂於道路紅線內
   *    - 相機錨點由前瞻偏移平滑回歸車輛實際坐標中心
   * 3. 起步無縫銜接動畫 (Seamless Departure Transition)：
   *    - 當車速 > 1.8 km/h 或手動觸碰時，觸發 1.25 秒 cubic ease-out 平滑過渡
   *    - 鏡頭沿最短角度平滑歸正 (0° 正向)，俯仰回歸 67.5°，縮放回歸 19.1
   */
  function createShowroomController(options) {
    const opts = options || {};
    const stopThresholdSec = Number.isFinite(opts.stopThresholdSec) ? opts.stopThresholdSec : 15.0;
    const orbitSpeedDegPerSec = Number.isFinite(opts.orbitSpeedDegPerSec) ? opts.orbitSpeedDegPerSec : 12.0;
    const showroomTiltDeg = Number.isFinite(opts.showroomTiltDeg) ? opts.showroomTiltDeg : 38.5;
    const showroomZoom = Number.isFinite(opts.showroomZoom) ? opts.showroomZoom : 19.45;
    const departureDurationSec = Number.isFinite(opts.departureDurationSec) ? opts.departureDurationSec : 1.25;

    let stopDurationSec = 0.0;
    let isActive = false;
    let isDeparting = false;
    let entryProgress = 0.0;
    let currentOrbitAngleDeg = 0.0;

    let departStartAngleDeg = 0.0;
    let departStartTiltDeg = 38.5;
    let departStartZoom = 19.45;
    let departElapsedSec = 0.0;

    function update(dtSec, speedKmh, isUserTouching, baseTiltDeg, baseZoom) {
      const dt = Math.max(0.0001, Number(dtSec) || 0.016);
      const speed = Math.max(0, Number(speedKmh) || 0);
      const bTilt = Number.isFinite(baseTiltDeg) ? baseTiltDeg : 67.5;
      const bZoom = Number.isFinite(baseZoom) ? baseZoom : 19.1;

      // 判斷車輛是否真正靜止
      if (speed <= 0.8 && !isUserTouching) {
        stopDurationSec += dt;
      } else if (speed > 1.2) {
        stopDurationSec = 0.0;
      }

      // 觸發條件：靜止持續超過 15 秒且無手動觸摸
      if (!isActive && !isDeparting && stopDurationSec >= stopThresholdSec && !isUserTouching) {
        isActive = true;
        entryProgress = 0.0;
        currentOrbitAngleDeg = 0.0;
      }

      // 離開條件：踩油門起步 (速度 > 1.8 km/h) 或 手動觸碰畫面
      if (isActive && (speed >= 1.8 || isUserTouching)) {
        isActive = false;
        isDeparting = true;
        departStartAngleDeg = currentOrbitAngleDeg;
        const easeIn = 1 - Math.pow(1 - entryProgress, 3);
        departStartTiltDeg = bTilt + (showroomTiltDeg - bTilt) * easeIn;
        departStartZoom = bZoom + (showroomZoom - bZoom) * easeIn;
        departElapsedSec = 0.0;
      }

      // 狀態 1：展廳 360° 環視中 (高空防遮擋俯角 + 車輛居中)
      if (isActive) {
        entryProgress = Math.min(1.0, entryProgress + dt / 1.6);
        const easeEntry = 1 - Math.pow(1 - entryProgress, 3);
        currentOrbitAngleDeg = (currentOrbitAngleDeg + orbitSpeedDegPerSec * dt) % 360;

        const tilt = bTilt + (showroomTiltDeg - bTilt) * easeEntry;
        const zoom = bZoom + (showroomZoom - bZoom) * easeEntry;

        return {
          isActive: true,
          isDeparting: false,
          stopDurationSec,
          headingOffsetDeg: currentOrbitAngleDeg,
          tiltDeg: tilt,
          zoom: zoom,
          centerVehicleWeight: easeEntry,
          statusText: '✨ 360° 尊爵展廳環視 (停等 15s)'
        };
      }

      // 狀態 2：起步無縫歸位過渡動畫 (Seamless Departure Transition)
      if (isDeparting) {
        departElapsedSec += dt;
        const t = Math.min(1.0, departElapsedSec / departureDurationSec);
        const easeOut = 1 - Math.pow(1 - t, 3);

        const angleDiff = normalizeAngleDiffDeg(0, departStartAngleDeg);
        const headingOffset = (departStartAngleDeg + angleDiff * easeOut + 360) % 360;
        const tilt = departStartTiltDeg + (bTilt - departStartTiltDeg) * easeOut;
        const zoom = departStartZoom + (bZoom - departStartZoom) * easeOut;
        const centerWeight = 1.0 - easeOut;

        if (t >= 1.0) {
          isDeparting = false;
          currentOrbitAngleDeg = 0.0;
        }

        return {
          isActive: false,
          isDeparting: true,
          stopDurationSec,
          headingOffsetDeg: headingOffset,
          tiltDeg: tilt,
          zoom: zoom,
          centerVehicleWeight: centerWeight,
          statusText: '⚡ 起步加速 · 鏡頭無縫歸位中'
        };
      }

      // 狀態 3：正常行駛
      return {
        isActive: false,
        isDeparting: false,
        stopDurationSec,
        headingOffsetDeg: null,
        tiltDeg: bTilt,
        zoom: bZoom,
        centerVehicleWeight: 0.0,
        statusText: null
      };
    }

    function reset() {
      stopDurationSec = 0.0;
      isActive = false;
      isDeparting = false;
      entryProgress = 0.0;
      currentOrbitAngleDeg = 0.0;
    }

    return {
      update,
      reset,
      isCinematicActive: () => isActive || isDeparting
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
    createRoadTracker,
    computeBrakeState,
    createShowroomController,
  };
});

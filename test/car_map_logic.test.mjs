import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const MapLogic = require('../app/src/main/assets/car_map_logic.js');

test('computeLaneMatchedCarScale scales up car model at zoom 17.0', () => {
  const scale17 = MapLogic.computeLaneMatchedCarScale(1.28, 17.0);
  assert.ok(scale17 > 4.5, `Expected scale at 17.0 to be > 4.5, got ${scale17}`);
  
  const scale18 = MapLogic.computeLaneMatchedCarScale(1.28, 18.0);
  assert.ok(scale18 > 3.0, `Expected scale at 18.0 to be > 3.0, got ${scale18}`);
  assert.ok(scale17 > scale18, 'Scale at zoom 17 should be boosted relative to zoom 18');
});

test('computeLookAheadCenter calculates lookahead offset without NaN at zoom 17.0', () => {
  const center = MapLogic.computeLookAheadCenter(25.0330, 121.5636, 0, 17.0);
  assert.ok(Number.isFinite(center.lat), 'Lat must be finite');
  assert.ok(Number.isFinite(center.lng), 'Lng must be finite');
  assert.ok(center.lat > 25.0330, 'Forward offset at 0 deg heading should increase latitude');
  assert.equal(Math.round(center.lng * 10000), Math.round(121.5636 * 10000), 'Longitude should stay roughly same heading North');
});

test('createRoadTracker clamps lateral building drift', () => {
  const tracker = MapLogic.createRoadTracker();
  // Initial point on road heading North (0 deg)
  const p0 = tracker.feedRawGps(25.0330, 121.5636, 40, 0, 1000, null);
  assert.equal(p0.lat, 25.0330);
  assert.equal(p0.lng, 121.5636);

  // Raw GPS suddenly jumps 35m East into a building
  // 35m East at lat 25 is roughly ~0.00035 degrees
  const p1 = tracker.feedRawGps(25.03305, 121.5640, 40, 0, 1500, null);
  const driftMeters = MapLogic.haversineMeters({ lat: 25.03305, lng: 121.5636 }, { lat: 25.03305, lng: p1.lng });
  // The lateral drift should be clamped well below the 35m jump, staying close to the road lane (< 7m)
  assert.ok(driftMeters < 7.0, `Lateral drift into building should be restricted to road lane, got ${driftMeters}m`);
});

test('normalizeAngleDiffDeg normalizes angle differences', () => {
  assert.equal(MapLogic.normalizeAngleDiffDeg(10, 350), 20);
  assert.equal(MapLogic.normalizeAngleDiffDeg(350, 10), -20);
});

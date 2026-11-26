import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAR_3D_ID,
  LAUNCHER_ITEMS,
  addCombo,
  removeCombo,
  resolveSplitViewLayout,
  validateComboCandidate,
  isDarkThemeActive,
  clampClockConfig,
  type Combo,
} from './launcherStore';

test('LAUNCHER_ITEMS includes 3D 電動車模型 for top/bottom split dropdowns', () => {
  const carItem = LAUNCHER_ITEMS.find((item) => item.id === CAR_3D_ID);
  assert.ok(carItem, '3D 電動車模型 must exist in LAUNCHER_ITEMS');
  assert.equal(carItem.label, '3D 電動車模型');
  assert.equal(carItem.kind, 'car3d');
});

test('validateComboCandidate rejects identical top and bottom items (including 3D EV + 3D EV)', () => {
  const res = validateComboCandidate(CAR_3D_ID, CAR_3D_ID, []);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.reason, '上下兩個項目不能相同');
  }
});

test('validateComboCandidate rejects duplicate combos in same order, allows swapped order', () => {
  const existing: Combo[] = [
    { id: '1', top: CAR_3D_ID, bottom: 'com.google.android.apps.maps' },
  ];

  const dup = validateComboCandidate(CAR_3D_ID, 'com.google.android.apps.maps', existing);
  assert.equal(dup.ok, false);

  const swapped = validateComboCandidate('com.google.android.apps.maps', CAR_3D_ID, existing);
  assert.equal(swapped.ok, true);
});

test('addCombo and removeCombo update list immutably', () => {
  const initial: Combo[] = [];
  const added = addCombo(initial, 'com.spotify.music', CAR_3D_ID);
  assert.equal(added.error, null);
  assert.equal(added.combos.length, 1);
  assert.equal(added.combos[0].top, 'com.spotify.music');
  assert.equal(added.combos[0].bottom, CAR_3D_ID);

  const removed = removeCombo(added.combos, 0);
  assert.equal(removed.length, 0);
});

test('resolveSplitViewLayout places 3D EV at first (top) or second (bottom) based on combo selection', () => {
  const topCarCombo: Combo = {
    id: 'top',
    top: CAR_3D_ID,
    bottom: 'com.google.android.apps.maps',
  };
  const topRes = resolveSplitViewLayout(topCarCombo, 'vertical');
  assert.equal(topRes.hasCar3D, true);
  assert.equal(topRes.car3DSlot, 'first');
  assert.equal(topRes.firstId, CAR_3D_ID);
  assert.equal(topRes.secondId, 'com.google.android.apps.maps');

  const bottomCarCombo: Combo = {
    id: 'bottom',
    top: 'com.spotify.music',
    bottom: CAR_3D_ID,
  };
  const bottomRes = resolveSplitViewLayout(bottomCarCombo, 'vertical');
  assert.equal(bottomRes.hasCar3D, true);
  assert.equal(bottomRes.car3DSlot, 'second');
  assert.equal(bottomRes.firstId, 'com.spotify.music');
  assert.equal(bottomRes.secondId, CAR_3D_ID);

  const twoAppsCombo: Combo = {
    id: 'apps',
    top: 'com.google.android.apps.maps',
    bottom: 'com.spotify.music',
  };
  const appsRes = resolveSplitViewLayout(twoAppsCombo, 'horizontal');
  assert.equal(appsRes.hasCar3D, false);
  assert.equal(appsRes.car3DSlot, null);
  assert.equal(appsRes.orientation, 'horizontal');
});

test('isDarkThemeActive handles auto, day, and night modes', () => {
  assert.equal(isDarkThemeActive(1, new Date('2026-11-25T23:00:00')), false);
  assert.equal(isDarkThemeActive(2, new Date('2026-11-25T12:00:00')), true);
  assert.equal(isDarkThemeActive(0, new Date('2026-11-25T13:00:00')), false);
  assert.equal(isDarkThemeActive(0, new Date('2026-11-25T20:00:00')), true);
});

test('clampClockConfig bounds coordinates and scale within safe desktop bounds', () => {
  const clamped = clampClockConfig({ x: -1, y: 5, scale: 10 });
  assert.equal(clamped.x, 0.02);
  assert.equal(clamped.y, 0.75);
  assert.equal(clamped.scale, 2.0);
});

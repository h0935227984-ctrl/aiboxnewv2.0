export const CAR_3D_ID = '__car_3d__' as const;

export type LauncherItemKind = 'car3d' | 'app';

export interface LauncherItem {
  id: string;
  label: string;
  shortLabel: string;
  kind: LauncherItemKind;
  category: string;
  accentHex: string;
}

export interface Combo {
  id: string;
  top: string;
  bottom: string;
}

export type ThemeMode = 0 | 1 | 2; // 0 = 自動, 1 = 日間, 2 = 夜間
export type CameraMode = 0 | 1 | 2; // 0 = 跟隨, 1 = 俯視, 2 = 展廳 360°
export type SplitOrientation = 'vertical' | 'horizontal';

export interface WallpaperPreset {
  id: string;
  label: string;
  url: string | null;
}

export interface ClockConfig {
  x: number; // 0..1 fraction
  y: number; // 0..1 fraction
  scale: number; // 0.5..2.2
}

export interface LauncherState {
  combos: Combo[];
  car3DOn: boolean;
  demoDriveOn: boolean;
  rainbowRoadOn: boolean;
  themeMode: ThemeMode;
  cameraMode: CameraMode;
  navBarOn: boolean;
  autoResumeSpotifyOn: boolean;
  blurOn: boolean;
  blurStrength: number; // 0..100
  dimOn: boolean;
  dimStrength: number; // 0..100
  wallpaperRandomOn: boolean;
  wallpaperUrl: string | null;
  customWallpapers: string[];
  clock: ClockConfig;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'default',
    label: '極簡霧銀 / 曜石預設',
    url: null,
  },
  {
    id: 'twilight_coast',
    label: '暮色濱海公路',
    url: '/src/assets/images/wallpaper_twilight_coast_1795659686621.jpg',
  },
  {
    id: 'studio_mist',
    label: '極簡霧光展廳',
    url: '/src/assets/images/wallpaper_studio_mist_1795659687440.jpg',
  },
];

export const LAUNCHER_ITEMS: LauncherItem[] = [
  {
    id: CAR_3D_ID,
    label: '3D 電動車模型',
    shortLabel: '3D 電動車',
    kind: 'car3d',
    category: '車載視覺',
    accentHex: '#0EA5E9',
  },
  {
    id: 'com.google.android.apps.maps',
    label: 'Google 地圖',
    shortLabel: '地圖導航',
    kind: 'app',
    category: '導航',
    accentHex: '#10B981',
  },
  {
    id: 'com.spotify.music',
    label: 'Spotify',
    shortLabel: 'Spotify',
    kind: 'app',
    category: '影音',
    accentHex: '#22C55E',
  },
  {
    id: 'com.google.android.apps.youtube.music',
    label: 'YouTube Music',
    shortLabel: 'YT Music',
    kind: 'app',
    category: '影音',
    accentHex: '#EF4444',
  },
  {
    id: 'com.android.dialer',
    label: '車載電話',
    shortLabel: '電話',
    kind: 'app',
    category: '通訊',
    accentHex: '#3B82F6',
  },
  {
    id: 'com.aibox.dashcam',
    label: '行車紀錄器',
    shortLabel: '行車紀錄',
    kind: 'app',
    category: '安全',
    accentHex: '#F59E0B',
  },
  {
    id: 'com.google.android.deskclock',
    label: '即時氣象',
    shortLabel: '天氣',
    kind: 'app',
    category: '資訊',
    accentHex: '#06B6D4',
  },
  {
    id: 'com.android.chrome',
    label: '車機瀏覽器',
    shortLabel: '瀏覽器',
    kind: 'app',
    category: '工具',
    accentHex: '#6366F1',
  },
  {
    id: 'com.google.android.calendar',
    label: '行程行事曆',
    shortLabel: '行事曆',
    kind: 'app',
    category: '效率',
    accentHex: '#14B8A6',
  },
];

export const DEFAULT_COMBOS: Combo[] = [
  {
    id: 'combo_ev_maps',
    top: CAR_3D_ID,
    bottom: 'com.google.android.apps.maps',
  },
  {
    id: 'combo_spotify_ev',
    top: 'com.spotify.music',
    bottom: CAR_3D_ID,
  },
  {
    id: 'combo_maps_spotify',
    top: 'com.google.android.apps.maps',
    bottom: 'com.spotify.music',
  },
];

export const DEFAULT_CLOCK: ClockConfig = {
  x: 0.04,
  y: 0.04,
  scale: 1,
};

export const DEFAULT_LAUNCHER_STATE: LauncherState = {
  combos: DEFAULT_COMBOS,
  car3DOn: true,
  demoDriveOn: true,
  rainbowRoadOn: true,
  themeMode: 2, // 預設夜間實景模式，讓 3D 電動車與漸層光帶對比更精緻
  cameraMode: 0,
  navBarOn: true,
  autoResumeSpotifyOn: true,
  blurOn: false,
  blurStrength: 45,
  dimOn: true,
  dimStrength: 35,
  wallpaperRandomOn: false,
  wallpaperUrl: WALLPAPER_PRESETS[1].url,
  customWallpapers: [],
  clock: DEFAULT_CLOCK,
};

const STORAGE_KEY = 'aibox_launcher_state_v2';

export function getLauncherItem(id: string): LauncherItem {
  return (
    LAUNCHER_ITEMS.find((item) => item.id === id) ?? {
      id,
      label: id,
      shortLabel: id,
      kind: 'app',
      category: '應用程式',
      accentHex: '#64748B',
    }
  );
}

export function getSelectableAppsOnly(): LauncherItem[] {
  return LAUNCHER_ITEMS.filter((item) => item.kind === 'app');
}

export function getComboDisplayLabel(combo: Combo): string {
  return `${getLauncherItem(combo.top).label} + ${getLauncherItem(combo.bottom).label}`;
}

export type ComboValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateComboCandidate(
  topId: string,
  bottomId: string,
  existingCombos: Combo[]
): ComboValidationResult {
  if (!topId || !bottomId) {
    return { ok: false, reason: '請選擇上下兩個項目' };
  }
  if (topId === bottomId) {
    return { ok: false, reason: '上下兩個項目不能相同' };
  }
  const duplicate = existingCombos.some(
    (c) => c.top === topId && c.bottom === bottomId
  );
  if (duplicate) {
    return { ok: false, reason: '這個分割組合已經存在' };
  }
  return { ok: true };
}

export function addCombo(
  existingCombos: Combo[],
  topId: string,
  bottomId: string
): { combos: Combo[]; error: string | null } {
  const check = validateComboCandidate(topId, bottomId, existingCombos);
  if (!check.ok) {
    return { combos: existingCombos, error: check.reason };
  }
  const next: Combo = {
    id: `combo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    top: topId,
    bottom: bottomId,
  };
  return { combos: [...existingCombos, next], error: null };
}

export function removeCombo(existingCombos: Combo[], index: number): Combo[] {
  if (index < 0 || index >= existingCombos.length) return existingCombos;
  return existingCombos.filter((_, idx) => idx !== index);
}

export interface SplitViewSlotResolution {
  firstId: string;
  secondId: string;
  hasCar3D: boolean;
  car3DSlot: 'first' | 'second' | null;
  orientation: SplitOrientation;
}

/**
 * 依據建立組合時的上下選單順序決定分割畫面呈現位置：
 * - top === CAR_3D_ID -> 3D 電動車模型顯示於畫面上面（或橫向左側）
 * - bottom === CAR_3D_ID -> 3D 電動車模型顯示於畫面下面（或橫向右側）
 */
export function resolveSplitViewLayout(
  combo: Combo,
  orientation: SplitOrientation = 'vertical'
): SplitViewSlotResolution {
  const car3DSlot =
    combo.top === CAR_3D_ID
      ? 'first'
      : combo.bottom === CAR_3D_ID
      ? 'second'
      : null;

  return {
    firstId: combo.top,
    secondId: combo.bottom,
    hasCar3D: car3DSlot !== null,
    car3DSlot,
    orientation,
  };
}

export function isDarkThemeActive(themeMode: ThemeMode, now: Date = new Date()): boolean {
  if (themeMode === 2) return true;
  if (themeMode === 1) return false;
  const hr = now.getHours();
  return hr < 6 || hr >= 18;
}

export function formatClockTime(now: Date = new Date()): string {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatClockDate(now: Date = new Date()): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${month}月${day}日 ${weekdays[now.getDay()]}`;
}

export function clampClockConfig(config: Partial<ClockConfig>): ClockConfig {
  return {
    x: Math.min(0.82, Math.max(0.02, config.x ?? DEFAULT_CLOCK.x)),
    y: Math.min(0.75, Math.max(0.02, config.y ?? DEFAULT_CLOCK.y)),
    scale: Math.min(2.0, Math.max(0.55, config.scale ?? DEFAULT_CLOCK.scale)),
  };
}

export function loadLauncherState(): LauncherState {
  if (typeof window === 'undefined') return DEFAULT_LAUNCHER_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAUNCHER_STATE;
    const parsed = JSON.parse(raw) as Partial<LauncherState>;
    const validIds = new Set(LAUNCHER_ITEMS.map((i) => i.id));
    const combos = Array.isArray(parsed.combos)
      ? parsed.combos.filter(
          (c): c is Combo =>
            Boolean(c && typeof c.top === 'string' && typeof c.bottom === 'string' && validIds.has(c.top) && validIds.has(c.bottom))
        )
      : DEFAULT_COMBOS;

    return {
      ...DEFAULT_LAUNCHER_STATE,
      ...parsed,
      combos: combos.length > 0 || Array.isArray(parsed.combos) ? combos : DEFAULT_COMBOS,
      clock: clampClockConfig(parsed.clock ?? DEFAULT_CLOCK),
    };
  } catch {
    return DEFAULT_LAUNCHER_STATE;
  }
}

export function saveLauncherState(state: LauncherState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

import React, { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import {
  addCombo,
  getComboDisplayLabel,
  getLauncherItem,
  isDarkThemeActive,
  loadLauncherState,
  removeCombo,
  saveLauncherState,
  type ClockConfig,
  type Combo,
  type LauncherState,
} from './utils/launcherStore';
import { Car3DViewer } from './components/Car3DViewer';
import { ClockPanel } from './components/ClockPanel';
import { AppIcon } from './components/AppIcon';
import { SplitManagerModal } from './components/SplitManagerModal';
import { SplitWorkspace } from './components/SplitWorkspace';
import { AppsDrawerModal } from './components/AppsDrawerModal';
import {
  SettingsMenuPopover,
  SystemSettingsDialog,
  WallpaperDialog,
} from './components/SettingsDialogs';
import { VirtualNavBar } from './components/VirtualNavBar';
import { RecentsModal, type RecentTask } from './components/RecentsModal';

export default function App() {
  const [state, setState] = useState<LauncherState>(() => loadLauncherState());
  const [clockEditing, setClockEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [splitManagerOpen, setSplitManagerOpen] = useState(false);
  const [appsDrawerOpen, setAppsDrawerOpen] = useState(false);
  const [appsInitialId, setAppsInitialId] = useState<string | null>(null);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [activeSplitCombo, setActiveSplitCombo] = useState<Combo | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>(() => [
    {
      key: 'combo:combo_ev_maps',
      kind: 'combo',
      combo: {
        id: 'combo_ev_maps',
        top: '__car_3d__',
        bottom: 'com.google.android.apps.maps',
      },
      label: '3D 電動車模型 + Google 地圖',
    },
    {
      key: 'app:com.spotify.music',
      kind: 'app',
      appId: 'com.spotify.music',
      label: 'Spotify',
    },
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const desktopRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
  };

  useEffect(() => {
    saveLauncherState(state);
  }, [state]);

  const isDark = isDarkThemeActive(state.themeMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const updateState = (patch: Partial<LauncherState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const handleClockChange = (nextClock: ClockConfig) => {
    updateState({ clock: nextClock });
  };

  const handleAddCombo = (topId: string, bottomId: string): string | null => {
    const res = addCombo(state.combos, topId, bottomId);
    if (res.error) return res.error;
    updateState({ combos: res.combos });
    showToast('已加入分割組合');
    return null;
  };

  const handleRemoveCombo = (index: number) => {
    const next = removeCombo(state.combos, index);
    updateState({ combos: next });
  };

  const pushRecentTask = (task: RecentTask) => {
    setRecentTasks((prev) => [task, ...prev.filter((t) => t.key !== task.key)].slice(0, 8));
  };

  const handleLaunchCombo = (combo: Combo) => {
    setSplitManagerOpen(false);
    setAppsDrawerOpen(false);
    setRecentsOpen(false);
    setActiveSplitCombo(combo);
    pushRecentTask({
      key: `combo:${combo.top}|${combo.bottom}`,
      kind: 'combo',
      combo,
      label: getComboDisplayLabel(combo),
    });
  };

  const handleOpenAppRecord = (appId: string) => {
    pushRecentTask({
      key: `app:${appId}`,
      kind: 'app',
      appId,
      label: getLauncherItem(appId).label,
    });
  };

  const handleNavBack = () => {
    if (wallpaperOpen) return setWallpaperOpen(false);
    if (systemOpen) return setSystemOpen(false);
    if (splitManagerOpen) return setSplitManagerOpen(false);
    if (recentsOpen) return setRecentsOpen(false);
    if (appsDrawerOpen) return setAppsDrawerOpen(false);
    if (activeSplitCombo) return setActiveSplitCombo(null);
    if (clockEditing) return setClockEditing(false);
  };

  const handleNavHome = () => {
    setWallpaperOpen(false);
    setSystemOpen(false);
    setSplitManagerOpen(false);
    setRecentsOpen(false);
    setAppsDrawerOpen(false);
    setAppsInitialId(null);
    setActiveSplitCombo(null);
    setMenuOpen(false);
    setClockEditing(false);
  };

  const hasCustomWallpaper = Boolean(state.wallpaperUrl);
  const blurPx = state.blurOn ? Math.round((state.blurStrength / 100) * 26) : 0;
  const dimAlpha = state.dimOn ? (state.dimStrength / 100) * 0.78 : 0;

  return (
    <div
      ref={desktopRef}
      data-testid="aibox-desktop"
      className="relative w-full h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white select-none"
    >
      {/* Layer 1: Wallpaper / Ambient Backdrop */}
      {state.wallpaperUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={state.wallpaperUrl}
            alt="桌面桌布"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-105 transition-[filter] duration-300"
            style={{ filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined }}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
        />
      )}

      {/* Layer 2: Dimmer Scrim */}
      {dimAlpha > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-slate-950 transition-opacity duration-300"
          style={{ opacity: hasCustomWallpaper ? dimAlpha : dimAlpha * 0.25 }}
        />
      )}

      {/* Layer 3: Floating Clock & Date (Left Top, draggable/scalable) */}
      <ClockPanel
        config={state.clock}
        editing={clockEditing}
        hasCustomWallpaper={hasCustomWallpaper}
        onChangeConfig={handleClockChange}
        onExitEdit={() => setClockEditing(false)}
        onEnterEdit={() => setClockEditing(true)}
        containerRef={desktopRef}
      />

      {/* Layer 4: Main Home Content Column (Feathered Blur Transitions Between All Sections — NO hard dividing lines) */}
      <main
        className={`relative z-10 w-full h-full flex flex-col justify-between transition-[padding] duration-200 ${
          state.navBarOn ? 'pb-16' : 'pb-4'
        }`}
      >
        {/* Top Control Zone with feathered blur mist transition */}
        <header className="relative flex items-center justify-end gap-2.5 px-6 pt-6 pb-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-36 -z-10 bg-gradient-to-b from-slate-200/75 via-slate-200/35 to-transparent dark:from-slate-950/75 dark:via-slate-950/35 dark:to-transparent backdrop-blur-md mask-feather-header"
          />

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="桌面設定"
            aria-expanded={menuOpen}
            className="w-10 h-10 rounded-full bg-white/75 dark:bg-slate-900/65 hover:bg-white/95 dark:hover:bg-slate-800/85 text-slate-800 dark:text-slate-100 inline-flex items-center justify-center shadow-sm transition-colors cursor-pointer"
          >
            <Settings size={20} />
          </button>
        </header>

        {/* Center Zone: 3D EV Showroom with Feathered Top & Bottom Alpha Mask (zero abrupt horizontal lines) */}
        <section
          aria-label="3D 電動車展廳"
          className="relative flex-1 min-h-[260px] w-full flex items-center justify-center"
        >
          {/* Upper feathered blur transition bridging Top Clock/Header and 3D EV Viewport */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-10 h-24 z-10 bg-gradient-to-b from-slate-100/50 via-slate-100/15 to-transparent dark:from-slate-950/55 dark:via-slate-950/18 dark:to-transparent blur-xl"
          />

          <div className="w-full h-full mask-feather-y">
            <Car3DViewer
              car3DOn={state.car3DOn}
              demoDriveOn={state.demoDriveOn}
              rainbowRoadOn={state.rainbowRoadOn}
              themeMode={state.themeMode}
              cameraMode={state.cameraMode}
            />
          </div>

          {/* Lower feathered blur transition bridging 3D EV Viewport and Split Combo Dock */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -bottom-10 h-28 z-10 bg-gradient-to-t from-slate-100/65 via-slate-100/25 to-transparent dark:from-slate-950/75 dark:via-slate-950/30 dark:to-transparent blur-xl"
          />
        </section>

        {/* Bottom Dock Zone: Split Combos with Feathered Blur Mist Backing (no hard cut line) */}
        <section
          aria-label="分割組合捷徑"
          className="relative w-full px-6 pt-4 pb-3"
        >
          {/* Soft feathered atmospheric backdrop blending dock into 3D viewport & bottom nav bar */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-12 -bottom-8 -z-10 bg-gradient-to-b from-transparent via-slate-200/50 to-slate-200/75 dark:via-slate-950/55 dark:to-slate-950/85 backdrop-blur-md mask-feather-soft-dock"
          />

          <div className="max-w-5xl mx-auto">
            {state.combos.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <button
                  type="button"
                  onClick={() => setSplitManagerOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-white/75 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors cursor-pointer"
                >
                  尚未設定分割組合 · 點擊新增
                </button>
              </div>
            ) : (
              <div
                data-testid="home-combos-grid"
                className="flex flex-wrap items-start justify-center gap-4 md:gap-5"
              >
                {state.combos.map((combo) => {
                  const topItem = getLauncherItem(combo.top);
                  const bottomItem = getLauncherItem(combo.bottom);
                  const label = getComboDisplayLabel(combo);
                  return (
                    <button
                      key={combo.id}
                      type="button"
                      onClick={() => handleLaunchCombo(combo)}
                      aria-label={`啟動 ${label}`}
                      className="group w-32 flex flex-col items-center gap-2 focus:outline-none cursor-pointer"
                    >
                      <div className="w-24 h-24 rounded-3xl bg-white/65 dark:bg-white/10 group-hover:bg-white/85 dark:group-hover:bg-white/18 shadow-[0_8px_28px_rgba(15,23,42,0.18)] flex flex-col items-center justify-center gap-1.5 transition-all duration-200 group-hover:-translate-y-0.5">
                        <AppIcon id={topItem.id} size="sm" />
                        <div className="w-10 h-px bg-slate-400/35 dark:bg-white/20" />
                        <AppIcon id={bottomItem.id} size="sm" />
                      </div>
                      <span
                        className={`text-[11px] font-medium text-center leading-snug line-clamp-2 [text-wrap:balance] ${
                          hasCustomWallpaper
                            ? 'text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Active Split Screen Workspace */}
      {activeSplitCombo && (
        <SplitWorkspace
          combo={activeSplitCombo}
          car3DOn={state.car3DOn}
          demoDriveOn={state.demoDriveOn}
          rainbowRoadOn={state.rainbowRoadOn}
          themeMode={state.themeMode}
          cameraMode={state.cameraMode}
          navBarOn={state.navBarOn}
          onExit={() => setActiveSplitCombo(null)}
        />
      )}

      {/* Popover & Dialogs */}
      <SettingsMenuPopover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenWallpaper={() => setWallpaperOpen(true)}
        onStartClockEdit={() => setClockEditing(true)}
        onOpenSystemSettings={() => setSystemOpen(true)}
      />

      <WallpaperDialog
        open={wallpaperOpen}
        state={state}
        onUpdate={updateState}
        onClose={() => setWallpaperOpen(false)}
      />

      <SystemSettingsDialog
        open={systemOpen}
        state={state}
        onUpdate={updateState}
        onOpenSplitManager={() => setSplitManagerOpen(true)}
        onClose={() => setSystemOpen(false)}
      />

      <SplitManagerModal
        open={splitManagerOpen}
        combos={state.combos}
        onClose={() => setSplitManagerOpen(false)}
        onAddCombo={handleAddCombo}
        onRemoveCombo={handleRemoveCombo}
        onLaunchCombo={handleLaunchCombo}
      />

      <AppsDrawerModal
        open={appsDrawerOpen}
        initialAppId={appsInitialId}
        onOpenApp={handleOpenAppRecord}
        onClose={() => {
          setAppsDrawerOpen(false);
          setAppsInitialId(null);
        }}
      />

      <RecentsModal
        open={recentsOpen}
        tasks={recentTasks}
        onClose={() => setRecentsOpen(false)}
        onSelectTask={(task) => {
          setRecentsOpen(false);
          if (task.kind === 'combo') {
            handleLaunchCombo(task.combo);
          } else {
            setActiveSplitCombo(null);
            setAppsInitialId(task.appId);
            setAppsDrawerOpen(true);
            handleOpenAppRecord(task.appId);
          }
        }}
        onDismissTask={(key) =>
          setRecentTasks((prev) => prev.filter((t) => t.key !== key))
        }
        onClearAll={() => setRecentTasks([])}
      />

      {/* Fixed Bottom Virtual Navigation Bar with Feathered Blur Transition */}
      <VirtualNavBar
        visible={state.navBarOn}
        onBack={handleNavBack}
        onHome={handleNavHome}
        onApps={() => {
          setSplitManagerOpen(false);
          setRecentsOpen(false);
          setAppsInitialId(null);
          setAppsDrawerOpen(true);
        }}
        onRecents={() => {
          setAppsDrawerOpen(false);
          setSplitManagerOpen(false);
          setRecentsOpen((v) => !v);
        }}
      />

      {/* Toast feedback */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

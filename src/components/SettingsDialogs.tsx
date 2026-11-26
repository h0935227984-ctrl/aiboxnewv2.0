import React, { useRef } from 'react';
import { Image, Clock, Sliders, X, Upload, RotateCcw } from 'lucide-react';
import {
  WALLPAPER_PRESETS,
  type CameraMode,
  type LauncherState,
  type ThemeMode,
} from '../utils/launcherStore';

interface SettingsMenuPopoverProps {
  open: boolean;
  onClose: () => void;
  onOpenWallpaper: () => void;
  onStartClockEdit: () => void;
  onOpenSystemSettings: () => void;
}

export const SettingsMenuPopover: React.FC<SettingsMenuPopoverProps> = ({
  open,
  onClose,
  onOpenWallpaper,
  onStartClockEdit,
  onOpenSystemSettings,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
    >
      <div
        role="menu"
        aria-label="桌面設定選單"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-16 right-6 w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/15 shadow-2xl p-2 space-y-1"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenWallpaper();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-left text-sm font-medium transition-colors cursor-pointer"
        >
          <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Image size={16} />
          </span>
          <span>桌布與背景美化設定</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onStartClockEdit();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-left text-sm font-medium transition-colors cursor-pointer"
        >
          <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </span>
          <span>調整時鐘位置與大小</span>
        </button>

        <div className="my-1 h-px bg-slate-200/80 dark:bg-white/10 mx-2" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenSystemSettings();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-left text-sm font-medium transition-colors cursor-pointer"
        >
          <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sliders size={16} />
          </span>
          <span>3D 車輛與系統導覽設定</span>
        </button>
      </div>
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </label>
);

interface WallpaperDialogProps {
  open: boolean;
  state: LauncherState;
  onUpdate: (patch: Partial<LauncherState>) => void;
  onClose: () => void;
}

export const WallpaperDialog: React.FC<WallpaperDialogProps> = ({
  open,
  state,
  onUpdate,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdate({
          wallpaperUrl: reader.result,
          customWallpapers: [reader.result, ...state.customWallpapers].slice(0, 6),
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="桌布與背景美化設定"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/65 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">桌布與背景美化設定</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉桌布設定"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <ToggleRow
              label="桌布背景虛化"
              checked={state.blurOn}
              onChange={(blurOn) => onUpdate({ blurOn })}
            />
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-14">虛化強度</span>
              <input
                type="range"
                aria-label="虛化強度"
                min={0}
                max={100}
                disabled={!state.blurOn}
                value={state.blurStrength}
                onChange={(e) => onUpdate({ blurStrength: Number(e.target.value) })}
                className="flex-1 accent-emerald-500 disabled:opacity-40"
              />
              <span className="text-xs font-mono-tabular w-9 text-right text-slate-500">
                {state.blurStrength}%
              </span>
            </div>
          </div>

          <div>
            <ToggleRow
              label="桌布壓暗調光"
              checked={state.dimOn}
              onChange={(dimOn) => onUpdate({ dimOn })}
            />
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-14">壓暗強度</span>
              <input
                type="range"
                aria-label="壓暗強度"
                min={0}
                max={100}
                disabled={!state.dimOn}
                value={state.dimStrength}
                onChange={(e) => onUpdate({ dimStrength: Number(e.target.value) })}
                className="flex-1 accent-emerald-500 disabled:opacity-40"
              />
              <span className="text-xs font-mono-tabular w-9 text-right text-slate-500">
                {state.dimStrength}%
              </span>
            </div>
          </div>

          <ToggleRow
            label="桌布隨機輪播"
            checked={state.wallpaperRandomOn}
            onChange={(wallpaperRandomOn) => onUpdate({ wallpaperRandomOn })}
          />
        </div>

        {/* Preset wallpapers */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            精選車載桌布
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {WALLPAPER_PRESETS.map((preset) => {
              const selected = state.wallpaperUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onUpdate({ wallpaperUrl: preset.url })}
                  className={`rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-400'
                  }`}
                >
                  <div className="h-14 w-full bg-gradient-to-br from-slate-700 to-slate-900">
                    {preset.url && (
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="px-2 py-1.5 text-[11px] font-medium truncate">
                    {preset.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFilePick}
          className="hidden"
        />

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload size={14} />
            <span>匯入自訂照片</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ wallpaperUrl: null })}
            className="px-4 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>還原預設</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold cursor-pointer"
        >
          完成
        </button>
      </div>
    </div>
  );
};

interface SystemSettingsDialogProps {
  open: boolean;
  state: LauncherState;
  onUpdate: (patch: Partial<LauncherState>) => void;
  onOpenSplitManager: () => void;
  onClose: () => void;
}

export const SystemSettingsDialog: React.FC<SystemSettingsDialogProps> = ({
  open,
  state,
  onUpdate,
  onOpenSplitManager,
  onClose,
}) => {
  if (!open) return null;

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 0, label: '自動' },
    { value: 1, label: '日間' },
    { value: 2, label: '夜間' },
  ];

  const cameraOptions: { value: CameraMode; label: string }[] = [
    { value: 0, label: '跟隨' },
    { value: 1, label: '俯視' },
    { value: 2, label: '展廳 360°' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="3D 車輛與系統導覽設定"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/65 p-4"
    >
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">3D 車輛與系統導覽設定</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉系統設定"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="divide-y divide-slate-200/70 dark:divide-white/10">
          <ToggleRow
            label="開啟 3D 車輛桌面展廳 (360° GLB)"
            checked={state.car3DOn}
            onChange={(car3DOn) => onUpdate({ car3DOn })}
          />
          <ToggleRow
            label="開啟模擬試駕預覽 (自動巡航)"
            checked={state.demoDriveOn}
            onChange={(demoDriveOn) => onUpdate({ demoDriveOn })}
          />
          <ToggleRow
            label="啟用彩虹大道模式 (炫彩光帶)"
            checked={state.rainbowRoadOn}
            onChange={(rainbowRoadOn) => onUpdate({ rainbowRoadOn })}
          />
          <ToggleRow
            label="開啟固定虛擬導覽列"
            checked={state.navBarOn}
            onChange={(navBarOn) => onUpdate({ navBarOn })}
          />
          <ToggleRow
            label="開機背景續播 Spotify／音樂"
            checked={state.autoResumeSpotifyOn}
            onChange={(autoResumeSpotifyOn) => onUpdate({ autoResumeSpotifyOn })}
          />
        </div>

        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            實景光影主題模式
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ themeMode: opt.value })}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  state.themeMode === opt.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            鏡頭視角模式
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {cameraOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ cameraMode: opt.value })}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  state.cameraMode === opt.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSplitManager();
            }}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer transition-colors"
          >
            分割畫面管理
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-semibold cursor-pointer transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

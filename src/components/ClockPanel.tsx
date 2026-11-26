import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { ClockConfig } from '../utils/launcherStore';
import {
  DEFAULT_CLOCK,
  clampClockConfig,
  formatClockDate,
  formatClockTime,
} from '../utils/launcherStore';

interface ClockPanelProps {
  config: ClockConfig;
  editing: boolean;
  hasCustomWallpaper: boolean;
  onChangeConfig: (next: ClockConfig) => void;
  onExitEdit: () => void;
  onEnterEdit: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ClockPanel: React.FC<ClockPanelProps> = ({
  config,
  editing,
  hasCustomWallpaper,
  onChangeConfig,
  onExitEdit,
  onEnterEdit,
  containerRef,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const dragModeRef = useRef<'move' | 'resize' | null>(null);
  const startPointRef = useRef<{ clientX: number; clientY: number; orig: ClockConfig }>({
    clientX: 0,
    clientY: 0,
    orig: config,
  });
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (!editing) {
      clearLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        onEnterEdit();
      }, 520);
      return;
    }
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragModeRef.current = mode;
    startPointRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      orig: config,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!editing || !dragModeRef.current) {
      if (
        Math.abs(e.clientX - startPointRef.current.clientX) > 8 ||
        Math.abs(e.clientY - startPointRef.current.clientY) > 8
      ) {
        clearLongPress();
      }
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    const sw = rect?.width || window.innerWidth;
    const sh = rect?.height || window.innerHeight;
    const dx = e.clientX - startPointRef.current.clientX;
    const dy = e.clientY - startPointRef.current.clientY;

    if (dragModeRef.current === 'move') {
      onChangeConfig(
        clampClockConfig({
          x: startPointRef.current.orig.x + dx / sw,
          y: startPointRef.current.orig.y + dy / sh,
          scale: startPointRef.current.orig.scale,
        })
      );
    } else if (dragModeRef.current === 'resize') {
      onChangeConfig(
        clampClockConfig({
          x: startPointRef.current.orig.x,
          y: startPointRef.current.orig.y,
          scale: startPointRef.current.orig.scale + dx / 180,
        })
      );
    }
  };

  const handlePointerUp = () => {
    clearLongPress();
    dragModeRef.current = null;
  };

  const timeFontPx = Math.round(54 * config.scale);
  const dateFontPx = Math.round(15 * config.scale);

  return (
    <div
      data-testid="clock-panel"
      onPointerDown={(e) => handlePointerDown(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        left: `${config.x * 100}%`,
        top: `${config.y * 100}%`,
      }}
      className={`absolute z-20 select-none transition-shadow duration-200 ${
        editing
          ? 'cursor-move rounded-3xl px-4 py-3 bg-emerald-500/15 ring-1 ring-emerald-400/70'
          : 'px-3 py-2'
      }`}
    >
      {/* Feathered ambient radial mist behind clock — zero hard box edge */}
      {!editing && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-slate-950/20 dark:bg-slate-950/35 blur-2xl"
        />
      )}

      <div
        className={`font-display font-bold leading-none tracking-tight font-mono-tabular ${
          hasCustomWallpaper
            ? 'text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]'
            : 'text-slate-900 dark:text-white'
        }`}
        style={{ fontSize: `${timeFontPx}px` }}
      >
        {formatClockTime(now)}
      </div>

      <div
        className={`mt-1.5 font-medium tracking-wide ${
          hasCustomWallpaper
            ? 'text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
            : 'text-slate-600 dark:text-slate-300'
        }`}
        style={{ fontSize: `${dateFontPx}px` }}
      >
        {formatClockDate(now)}
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExitEdit();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Check size={13} />
            <span>完成</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeConfig(DEFAULT_CLOCK);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw size={13} />
            <span>重設</span>
          </button>
          <button
            type="button"
            aria-label="拖曳縮放時鐘大小"
            onPointerDown={(e) => handlePointerDown(e, 'resize')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white text-white flex items-center justify-center text-[10px] font-bold cursor-ew-resize shadow"
            title="左右拖曳縮放大小"
          >
            ↔
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { ArrowLeft, Plus, X, ArrowUpDown } from 'lucide-react';
import {
  CAR_3D_ID,
  LAUNCHER_ITEMS,
  getComboDisplayLabel,
  getLauncherItem,
  type Combo,
} from '../utils/launcherStore';
import { AppIcon } from './AppIcon';

interface SplitManagerModalProps {
  open: boolean;
  combos: Combo[];
  onClose: () => void;
  onAddCombo: (topId: string, bottomId: string) => string | null;
  onRemoveCombo: (index: number) => void;
  onLaunchCombo: (combo: Combo) => void;
}

export const SplitManagerModal: React.FC<SplitManagerModalProps> = ({
  open,
  combos,
  onClose,
  onAddCombo,
  onRemoveCombo,
  onLaunchCombo,
}) => {
  const [topId, setTopId] = useState<string>(CAR_3D_ID);
  const [bottomId, setBottomId] = useState<string>('com.google.android.apps.maps');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onAddCombo(topId, bottomId);
    setErrorMsg(err);
  };

  const handleSwap = () => {
    setTopId(bottomId);
    setBottomId(topId);
    setErrorMsg(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="螢幕分割 App 管理器"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 md:p-8"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="返回桌面"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-xl font-bold tracking-tight">
              螢幕分割 App 管理器
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉分割管理"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* 建立新分割組合 — 上下選單皆包含「3D 電動車模型」 */}
          <form
            onSubmit={handleCreate}
            className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/10 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  建立新分割組合
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  可在上方或下方選單選擇「3D 電動車模型」，自由決定使用分割組合時 3D 模型顯示在畫面上面或下面
                </p>
              </div>
              <button
                type="button"
                onClick={handleSwap}
                aria-label="上下對調"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <ArrowUpDown size={14} />
                <span>上下對調</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  上半區 / 左側項目
                </span>
                <select
                  aria-label="上半區 / 左側項目"
                  value={topId}
                  onChange={(e) => {
                    setTopId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {LAUNCHER_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  下半區 / 右側項目
                </span>
                <select
                  aria-label="下半區 / 右側項目"
                  value={bottomId}
                  onChange={(e) => {
                    setBottomId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {LAUNCHER_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {errorMsg && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>加入分割組合</span>
            </button>
          </form>

          {/* 已儲存的組合 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              已儲存的組合（點一下啟動，✕ 刪除）
            </h3>

            {combos.length === 0 ? (
              <div className="rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                尚未建立任何分割組合，請從上方選單新增。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {combos.map((combo, index) => {
                  const topItem = getLauncherItem(combo.top);
                  const bottomItem = getLauncherItem(combo.bottom);
                  const fullLabel = getComboDisplayLabel(combo);
                  return (
                    <div key={combo.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => onLaunchCombo(combo)}
                        aria-label={`啟動 ${fullLabel}`}
                        className="w-full rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 p-3.5 flex flex-col items-center gap-2.5 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <AppIcon id={topItem.id} size="sm" />
                          <div className="w-10 h-px bg-slate-300/70 dark:bg-white/15" />
                          <AppIcon id={bottomItem.id} size="sm" />
                        </div>
                        <span className="text-xs font-medium text-center text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                          {fullLabel}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-label={`刪除 ${fullLabel}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCombo(index);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs shadow transition-colors cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

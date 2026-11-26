import React from 'react';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import {
  getComboDisplayLabel,
  getLauncherItem,
  type Combo,
} from '../utils/launcherStore';
import { AppIcon } from './AppIcon';

export type RecentTask =
  | { key: string; kind: 'combo'; combo: Combo; label: string }
  | { key: string; kind: 'app'; appId: string; label: string };

interface RecentsModalProps {
  open: boolean;
  tasks: RecentTask[];
  onClose: () => void;
  onSelectTask: (task: RecentTask) => void;
  onDismissTask: (key: string) => void;
  onClearAll: () => void;
}

export const RecentsModal: React.FC<RecentsModalProps> = ({
  open,
  tasks,
  onClose,
  onSelectTask,
  onDismissTask,
  onClearAll,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="最近工作分頁"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-8"
    >
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col rounded-3xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="返回"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-xl font-bold tracking-tight">
              最近工作分頁
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 size={14} />
                <span>全部清除</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉最近工作分頁"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {tasks.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                目前沒有最近開啟的分頁
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                從桌面或應用程式清單開啟功能後，會顯示於此供快速切換
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.key}
                  className="relative group rounded-2xl bg-white dark:bg-slate-800/85 border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    aria-label={`切換至 ${task.label}`}
                    className="w-full text-left p-4 flex flex-col gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 pr-7">
                      {task.kind === 'combo' ? (
                        <div className="flex items-center -space-x-1.5">
                          <AppIcon id={task.combo.top} size="sm" />
                          <AppIcon id={task.combo.bottom} size="sm" />
                        </div>
                      ) : (
                        <AppIcon id={task.appId} size="sm" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {task.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {task.kind === 'combo' ? '分割分頁' : getLauncherItem(task.appId).category}
                        </div>
                      </div>
                    </div>

                    {/* Visual page preview card */}
                    <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-950/75 p-2.5 flex flex-col justify-center gap-1.5">
                      {task.kind === 'combo' ? (
                        <>
                          <div className="flex-1 rounded-lg bg-white/80 dark:bg-slate-800/80 px-3 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                            <AppIcon id={task.combo.top} size="sm" className="w-5 h-5 rounded-md" />
                            <span className="truncate">{getLauncherItem(task.combo.top).label}</span>
                          </div>
                          <div className="flex-1 rounded-lg bg-white/80 dark:bg-slate-800/80 px-3 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                            <AppIcon id={task.combo.bottom} size="sm" className="w-5 h-5 rounded-md" />
                            <span className="truncate">{getLauncherItem(task.combo.bottom).label}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 rounded-lg bg-white/80 dark:bg-slate-800/80 flex flex-col items-center justify-center gap-1.5">
                          <AppIcon id={task.appId} size="md" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {getComboDisplayLabel({ id: task.key, top: task.appId, bottom: task.appId }).split(' + ')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label={`關閉 ${task.label} 分頁`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissTask(task.key);
                    }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-200/80 dark:bg-slate-700/80 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

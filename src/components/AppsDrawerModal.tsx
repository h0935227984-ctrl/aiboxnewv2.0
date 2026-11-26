import React, { useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { getSelectableAppsOnly, type LauncherItem } from '../utils/launcherStore';
import { AppIcon } from './AppIcon';
import { AppSurfaceCard } from './AppSurfaceCard';

interface AppsDrawerModalProps {
  open: boolean;
  initialAppId?: string | null;
  onOpenApp?: (appId: string) => void;
  onClose: () => void;
}

export const AppsDrawerModal: React.FC<AppsDrawerModalProps> = ({
  open,
  initialAppId = null,
  onOpenApp,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [activeApp, setActiveApp] = useState<LauncherItem | null>(null);

  React.useEffect(() => {
    if (!open) {
      setActiveApp(null);
      return;
    }
    if (initialAppId) {
      const found = getSelectableAppsOnly().find((a) => a.id === initialAppId) ?? null;
      setActiveApp(found);
    } else {
      setActiveApp(null);
    }
  }, [open, initialAppId]);

  if (!open) return null;

  const allApps = getSelectableAppsOnly();
  const filtered = allApps.filter((app) =>
    app.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全部 App"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 md:p-8"
    >
      <div className="w-full max-w-3xl max-h-[86vh] flex flex-col rounded-3xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activeApp) setActiveApp(null);
                else onClose();
              }}
              aria-label="返回"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {activeApp ? activeApp.label : '全部 App'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveApp(null);
              onClose();
            }}
            aria-label="關閉應用程式清單"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {activeApp ? (
          <div className="flex-1 min-h-[340px] p-4">
            <div className="w-full h-full rounded-2xl overflow-hidden">
              <AppSurfaceCard appId={activeApp.id} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋車機應用程式…"
                aria-label="搜尋應用程式"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                找不到符合「{query}」的應用程式
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                {filtered.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      setActiveApp(app);
                      onOpenApp?.(app.id);
                    }}
                    className="rounded-2xl p-3.5 flex flex-col items-center gap-2.5 bg-white/80 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-white/10 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <AppIcon id={app.id} size="lg" />
                    <span className="text-xs font-medium text-center text-slate-800 dark:text-slate-200 truncate w-full">
                      {app.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

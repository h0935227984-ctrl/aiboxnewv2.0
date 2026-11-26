import React from 'react';
import { ChevronLeft, Home, LayoutGrid } from 'lucide-react';

interface VirtualNavBarProps {
  visible: boolean;
  onBack: () => void;
  onHome: () => void;
  onApps: () => void;
  onRecents: () => void;
}

export const VirtualNavBar: React.FC<VirtualNavBarProps> = ({
  visible,
  onBack,
  onHome,
  onApps,
  onRecents,
}) => {
  if (!visible) return null;

  return (
    <nav
      aria-label="虛擬導覽列"
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto"
    >
      {/* Feathered upward blur transition — NO sharp horizontal border line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-12 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent backdrop-blur-md mask-feather-top"
      />
      <div className="relative flex items-center justify-around h-14 max-w-4xl mx-auto px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className="flex-1 h-full flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={onHome}
          aria-label="首頁"
          className="flex-1 h-full flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          <Home size={20} />
        </button>
        <button
          type="button"
          onClick={onApps}
          aria-label="應用程式"
          className="flex-1 h-full flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          <LayoutGrid size={20} />
        </button>
        <button
          type="button"
          onClick={onRecents}
          aria-label="最近工作分頁"
          className="flex-1 h-full flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          {/* Authentic Android stacked pages / recents icon matching ic_nav_recents.xml */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-current"
            aria-hidden="true"
          >
            <path d="M4,6H2v14c0,1.1 0.9,2 2,2h14v-2H4V6zM20,2H8C6.9,2 6,2.9 6,4v12c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V4C22,2.9 21.1,2 20,2zM20,16H8V4h12V16z" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

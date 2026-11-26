import React, { useState } from 'react';
import { ArrowLeft, Columns2, Rows2 } from 'lucide-react';
import {
  CAR_3D_ID,
  getComboDisplayLabel,
  resolveSplitViewLayout,
  type CameraMode,
  type Combo,
  type SplitOrientation,
  type ThemeMode,
} from '../utils/launcherStore';
import { Car3DViewer } from './Car3DViewer';
import { AppSurfaceCard } from './AppSurfaceCard';

interface SplitWorkspaceProps {
  combo: Combo;
  car3DOn: boolean;
  demoDriveOn: boolean;
  rainbowRoadOn: boolean;
  themeMode: ThemeMode;
  cameraMode: CameraMode;
  navBarOn: boolean;
  onExit: () => void;
}

export const SplitWorkspace: React.FC<SplitWorkspaceProps> = ({
  combo,
  car3DOn,
  demoDriveOn,
  rainbowRoadOn,
  themeMode,
  cameraMode,
  navBarOn,
  onExit,
}) => {
  const [orientation, setOrientation] = useState<SplitOrientation>('vertical');
  const layout = resolveSplitViewLayout(combo, orientation);

  const renderSlot = (slotId: string, position: 'first' | 'second') => {
    if (slotId === CAR_3D_ID) {
      return (
        <div
          data-testid={`split-slot-${position}-car3d`}
          className="relative w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden"
        >
          <Car3DViewer
            car3DOn={car3DOn}
            demoDriveOn={demoDriveOn}
            rainbowRoadOn={rainbowRoadOn}
            themeMode={themeMode}
            cameraMode={cameraMode}
            compact
          />
          <div className="pointer-events-none absolute top-3 left-4 text-xs font-semibold text-sky-300/90">
            3D 電動車模型 · {position === 'first' ? (orientation === 'vertical' ? '上方畫面' : '左側畫面') : orientation === 'vertical' ? '下方畫面' : '右側畫面'}
          </div>
        </div>
      );
    }

    return (
      <div
        data-testid={`split-slot-${position}-app`}
        className="w-full h-full overflow-hidden"
      >
        <AppSurfaceCard appId={slotId} />
      </div>
    );
  };

  return (
    <div
      data-testid="split-workspace"
      className={`fixed inset-0 z-30 flex flex-col bg-slate-950 text-white ${
        navBarOn ? 'pb-14' : ''
      }`}
    >
      {/* Top control strip */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 bg-slate-950/90">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            aria-label="返回桌面"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft size={14} />
            <span>返回桌面</span>
          </button>
          <span className="text-sm font-semibold text-slate-200 truncate">
            {getComboDisplayLabel(combo)}
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setOrientation('vertical')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              orientation === 'vertical'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Rows2 size={14} />
            <span>上下分割</span>
          </button>
          <button
            type="button"
            onClick={() => setOrientation('horizontal')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              orientation === 'horizontal'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns2 size={14} />
            <span>左右分割</span>
          </button>
        </div>
      </div>

      {/* Split panes with soft blurred transition band between slots */}
      <div
        className={`relative flex-1 min-h-0 flex ${
          orientation === 'vertical' ? 'flex-col' : 'flex-row'
        } gap-2 p-3`}
      >
        <div className="relative flex-1 min-h-0 min-w-0 rounded-2xl overflow-hidden">
          {renderSlot(layout.firstId, 'first')}
        </div>
        <div className="relative flex-1 min-h-0 min-w-0 rounded-2xl overflow-hidden">
          {renderSlot(layout.secondId, 'second')}
        </div>
      </div>
    </div>
  );
};

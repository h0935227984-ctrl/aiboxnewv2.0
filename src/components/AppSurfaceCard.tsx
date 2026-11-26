import React, { useState } from 'react';
import {
  Navigation,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  PhoneCall,
  CloudSun,
  Calendar,
  Globe,
  Video,
  MapPin,
} from 'lucide-react';
import { getLauncherItem } from '../utils/launcherStore';
import { AppIcon } from './AppIcon';

interface AppSurfaceCardProps {
  appId: string;
}

const TRACKS = [
  { title: 'Midnight Highway', artist: 'AIBOX Drive Mix', duration: '03:42' },
  { title: 'Coastal Horizon', artist: 'Electric Pulse', duration: '04:15' },
  { title: 'Neon Rain', artist: 'City Lights', duration: '03:18' },
];

export const AppSurfaceCard: React.FC<AppSurfaceCardProps> = ({ appId }) => {
  const item = getLauncherItem(appId);
  const [playing, setPlaying] = useState(true);
  const [trackIndex, setTrackIndex] = useState(0);
  const [routeIdx, setRouteIdx] = useState(0);
  const [dialNumber, setDialNumber] = useState('');

  const routes = [
    { name: '台北 101 地下停車場', eta: '14 分鐘', dist: '6.8 km', next: '前方 350 公尺右轉信義路五段' },
    { name: '內湖科學園區充電站', eta: '22 分鐘', dist: '11.4 km', next: '沿堤頂大道直行 2.1 公里' },
  ];

  if (appId === 'com.google.android.apps.maps') {
    const r = routes[routeIdx];
    return (
      <div className="w-full h-full flex flex-col justify-between p-5 bg-slate-900/90 text-slate-100 select-none overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AppIcon id={appId} size="sm" />
            <div>
              <h3 className="text-sm font-bold leading-tight">Google 地圖導航</h3>
              <p className="text-xs text-emerald-400">{r.next}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {routes.map((rt, i) => (
              <button
                key={rt.name}
                type="button"
                onClick={() => setRouteIdx(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  routeIdx === i
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                路線 {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="my-3 flex-1 rounded-2xl bg-slate-950/70 relative overflow-hidden flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 35%, rgba(16,185,129,0.28), transparent 45%), linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 32px 32px, 32px 32px',
            }}
          />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Navigation size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin size={12} />
                <span>目的地</span>
              </div>
              <div className="text-base font-bold text-white">{r.name}</div>
              <div className="text-xs text-emerald-400 font-mono-tabular mt-0.5">
                預估 {r.eta} · {r.dist}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appId === 'com.spotify.music' || appId === 'com.google.android.apps.youtube.music') {
    const track = TRACKS[trackIndex];
    const isYt = appId === 'com.google.android.apps.youtube.music';
    return (
      <div className="w-full h-full flex flex-col justify-between p-5 bg-slate-900/90 text-slate-100 select-none">
        <div className="flex items-center gap-2.5">
          <AppIcon id={appId} size="sm" />
          <span className="text-sm font-bold">{item.label}</span>
        </div>

        <div className="flex items-center justify-between gap-4 my-2">
          <div className="min-w-0">
            <div className="text-lg font-bold text-white truncate">{track.title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{track.artist}</div>
          </div>
          <span className="text-xs font-mono-tabular text-slate-400 shrink-0">
            {track.duration}
          </span>
        </div>

        <div className="space-y-3">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isYt ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: playing ? '64%' : '42%' }}
            />
          </div>
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label="上一首"
              onClick={() => setTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length)}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <SkipBack size={19} />
            </button>
            <button
              type="button"
              aria-label={playing ? '暫停播放' : '開始播放'}
              onClick={() => setPlaying((p) => !p)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow cursor-pointer ${
                isYt ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              type="button"
              aria-label="下一首"
              onClick={() => setTrackIndex((i) => (i + 1) % TRACKS.length)}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <SkipForward size={19} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appId === 'com.android.dialer') {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    return (
      <div className="w-full h-full flex flex-col justify-between p-5 bg-slate-900/90 text-slate-100 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppIcon id={appId} size="sm" />
            <span className="text-sm font-bold">車載電話</span>
          </div>
          <span className="text-sm font-mono-tabular text-sky-400">
            {dialNumber || '輸入號碼'}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2 my-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDialNumber((v) => (v + k).slice(0, 12))}
              className="h-9 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold cursor-pointer"
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDialNumber('')}
            className="px-4 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium cursor-pointer"
          >
            清除
          </button>
          <button
            type="button"
            className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PhoneCall size={14} />
            <span>撥號</span>
          </button>
        </div>
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    'com.aibox.dashcam': <Video size={26} className="text-amber-400" />,
    'com.google.android.deskclock': <CloudSun size={26} className="text-cyan-400" />,
    'com.android.chrome': <Globe size={26} className="text-indigo-400" />,
    'com.google.android.calendar': <Calendar size={26} className="text-teal-400" />,
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-5 bg-slate-900/90 text-slate-100 select-none">
      <div className="flex items-center gap-2.5">
        <AppIcon id={appId} size="sm" />
        <div>
          <h3 className="text-sm font-bold">{item.label}</h3>
          <p className="text-xs text-slate-400">{item.category}</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        {iconMap[appId] ?? <AppIcon id={appId} size="lg" />}
        <p className="text-sm font-semibold text-white">{item.label} 執行中</p>
        <p className="text-xs text-slate-400">車機分割視窗模式已就緒</p>
      </div>
    </div>
  );
};

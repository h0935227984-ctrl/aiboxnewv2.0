import React from 'react';
import {
  CarFront,
  Compass,
  Music,
  PlayCircle,
  Phone,
  Video,
  CloudSun,
  Globe,
  Calendar,
  AppWindow,
} from 'lucide-react';
import { CAR_3D_ID } from '../utils/launcherStore';

interface AppIconProps {
  id: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', { box: string; icon: number }> = {
  sm: { box: 'w-8 h-8 rounded-xl', icon: 17 },
  md: { box: 'w-10 h-10 rounded-xl', icon: 21 },
  lg: { box: 'w-14 h-14 rounded-2xl', icon: 28 },
};

export const AppIcon: React.FC<AppIconProps> = ({ id, size = 'md', className = '' }) => {
  const cfg = SIZE_CLASSES[size];

  const renderInner = () => {
    switch (id) {
      case CAR_3D_ID:
        return {
          bg: 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/30',
          icon: <CarFront size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.google.android.apps.maps':
        return {
          bg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25',
          icon: <Compass size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.spotify.music':
        return {
          bg: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm shadow-green-500/25',
          icon: <Music size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.google.android.apps.youtube.music':
        return {
          bg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm shadow-rose-500/25',
          icon: <PlayCircle size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.android.dialer':
        return {
          bg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/25',
          icon: <Phone size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.aibox.dashcam':
        return {
          bg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/25',
          icon: <Video size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.google.android.deskclock':
        return {
          bg: 'bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-sm shadow-cyan-500/25',
          icon: <CloudSun size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.android.chrome':
        return {
          bg: 'bg-gradient-to-br from-indigo-500 to-slate-700 text-white shadow-sm shadow-indigo-500/25',
          icon: <Globe size={cfg.icon} strokeWidth={2} />,
        };
      case 'com.google.android.calendar':
        return {
          bg: 'bg-gradient-to-br from-teal-500 to-cyan-700 text-white shadow-sm shadow-teal-500/25',
          icon: <Calendar size={cfg.icon} strokeWidth={2} />,
        };
      default:
        return {
          bg: 'bg-slate-700 text-white',
          icon: <AppWindow size={cfg.icon} strokeWidth={2} />,
        };
    }
  };

  const { bg, icon } = renderInner();
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${cfg.box} ${bg} ${className}`}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
};

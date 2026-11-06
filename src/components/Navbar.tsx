import React from 'react';
import { Volume2, VolumeX, Users, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';

interface NavbarProps {
  currentTab: 'lobby' | 'auction' | 'squads' | 'tournament' | 'match' | 'trophy' | 'database';
  onSelectTab: (tab: 'lobby' | 'auction' | 'squads' | 'tournament' | 'match' | 'trophy' | 'database') => void;
  roomCode?: string;
  isHost?: boolean;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  roomCode,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('lobby');
          }}
          className="text-xl font-extrabold tracking-wider text-amber-400 font-condensed uppercase flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-2xl">🏏</span>
          <span>CRICKET ARENA</span>
          {roomCode && (
            <span className="text-xs tracking-normal text-slate-400 font-sans font-normal border border-slate-700/80 px-2 py-0.5 rounded">
              Room {roomCode}
            </span>
          )}
        </a>
      </div>

      {/* Zone 2: Navigation Links (Single-line, concise) */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        <button
          onClick={() => onSelectTab('lobby')}
          className={`transition-colors whitespace-nowrap py-1 ${
            currentTab === 'lobby'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Lobby
        </button>

        <button
          onClick={() => onSelectTab('auction')}
          className={`transition-colors whitespace-nowrap py-1 ${
            currentTab === 'auction'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Mega Auction
        </button>

        <button
          onClick={() => onSelectTab('squads')}
          className={`transition-colors whitespace-nowrap py-1 ${
            currentTab === 'squads'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Squads & XI
        </button>

        <button
          onClick={() => onSelectTab('tournament')}
          className={`transition-colors whitespace-nowrap py-1 ${
            currentTab === 'tournament' || currentTab === 'match'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Tournament
        </button>

        <button
          onClick={() => onSelectTab('database')}
          className={`transition-colors whitespace-nowrap py-1 ${
            currentTab === 'database'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Player Database
        </button>
      </nav>

      {/* Zone 3: Primary Action & Sound */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleToggleSound}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {roomCode && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Leave Room
          </button>
        )}
      </div>
    </header>
  );
};

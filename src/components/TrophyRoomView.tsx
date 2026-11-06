import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RoomState } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import { Trophy, Award, Star, Flame, Sparkles, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

interface TrophyRoomViewProps {
  roomState: RoomState;
  onResetSeason: () => void;
  onBackToTournament: () => void;
}

export const TrophyRoomView: React.FC<TrophyRoomViewProps> = ({
  roomState,
  onResetSeason,
  onBackToTournament,
}) => {
  const tournament = roomState.tournament;
  const championId = tournament.champion || 'CSK';
  const runnerUpId = tournament.runnerUp;
  const champion = IPL_FRANCHISES[championId];
  const runnerUp = runnerUpId ? IPL_FRANCHISES[runnerUpId] : null;

  useEffect(() => {
    sound.playCheer();
    // Burst confetti from both sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#fbbf24', '#ffffff', '#38bdf8', '#ef4444'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 text-center">
      {/* Trophy Spotlight */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official Season Presentation Ceremony</span>
        </div>

        <div className="relative py-6">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-1 shadow-2xl shadow-amber-500/40 flex items-center justify-center">
            <Trophy className="w-16 h-16 text-slate-950 fill-current" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white font-condensed tracking-wide uppercase">
          {champion.name} are the IPL Champions!
        </h1>
        <p className="text-base text-slate-400 max-w-xl mx-auto">
          Through a rigorous auction, strategic squad building, and supreme playoff execution,{' '}
          <span className="text-amber-400 font-semibold">{champion.name}</span> lift the coveted
          IPL Trophy!
        </p>
      </div>

      {/* Awards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {/* Champion */}
        <div
          className="p-6 rounded-2xl border bg-slate-900 shadow-xl relative overflow-hidden"
          style={{ borderColor: `${champion.primaryColor}80` }}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase text-amber-400 mb-3">
            <span>IPL Champions</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-100 flex items-center gap-2 font-condensed">
            <span>{champion.logoSymbol}</span>
            <span>{champion.name}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Prize Purse: ₹20 Crore · Motto: {champion.motto}
          </div>
        </div>

        {/* Orange Cap */}
        <div className="p-6 rounded-2xl border border-orange-500/40 bg-orange-950/20 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-orange-400 mb-3">
            <span>Orange Cap (Top Batsman)</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-condensed">
            {tournament.orangeCapLeader?.playerName || 'Tournament Top Run Scorer'}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-mono-stats">
            {tournament.orangeCapLeader?.subText || 'High-scoring tournament campaign'} ·{' '}
            {tournament.orangeCapLeader?.franchiseId}
          </div>
        </div>

        {/* Purple Cap */}
        <div className="p-6 rounded-2xl border border-purple-500/40 bg-purple-950/20 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-purple-400 mb-3">
            <span>Purple Cap (Top Bowler)</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-condensed">
            {tournament.purpleCapLeader?.playerName || 'Tournament Leading Wicket-Taker'}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-mono-stats">
            {tournament.purpleCapLeader?.subText || 'Spearhead bowling execution'} ·{' '}
            {tournament.purpleCapLeader?.franchiseId}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-6">
        <button
          onClick={onBackToTournament}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
        >
          View Tournament Records
        </button>

        <button
          onClick={onResetSeason}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Lobby</span>
        </button>
      </div>
    </div>
  );
};

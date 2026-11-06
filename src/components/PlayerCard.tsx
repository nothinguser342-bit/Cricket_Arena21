import React from 'react';
import { Player } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import { Shield, Star, Globe } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  showBidPrice?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  compact = false,
  onSelect,
  isSelected = false,
  showBidPrice = false,
}) => {
  const roleLabels: Record<string, string> = {
    BAT: 'Batter',
    WK: 'Wicketkeeper',
    AR: 'All-Rounder',
    BOWL: 'Bowler',
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Marquee':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'Tier 1':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      case 'Tier 2':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800/40';
    }
  };

  const team = player.soldTo ? IPL_FRANCHISES[player.soldTo] : null;

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
          isSelected
            ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        } ${onSelect ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-200 border border-slate-700 font-mono-stats">
            {player.overallRating}
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              <span>{player.name}</span>
              {player.isOverseas && (
                <span className="text-[10px] text-amber-400 font-mono" title="Overseas Player">
                  ✈
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>{roleLabels[player.role]}</span>
              <span aria-hidden="true">·</span>
              <span>{player.country}</span>
              {team && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold" style={{ color: team.primaryColor }}>
                    {team.id}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold text-amber-400 font-mono-stats">
            {player.soldPriceCr ? `₹${player.soldPriceCr.toFixed(2)} Cr` : `₹${player.basePriceCr.toFixed(2)} Cr`}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-stats">
            {player.role === 'BOWL'
              ? `${player.stats.wickets} wkts`
              : `${player.stats.runs} runs`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border p-5 transition-all overflow-hidden ${
        isSelected
          ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Top Banner: Tier & Nationality */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${getTierColor(player.tier)}`}>
          {player.tier}
        </span>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>{player.country}</span>
          {player.isOverseas && <span className="text-amber-400 font-mono">✈ Overseas</span>}
        </div>
      </div>

      {/* Main Info */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100 font-condensed tracking-wide">
            {player.name}
          </h3>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{roleLabels[player.role]}</span>
            <span aria-hidden="true">·</span>
            <span>{player.battingStyle}</span>
          </div>
          {player.bowlingStyle !== 'None' && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              Bowl: {player.bowlingStyle}
            </div>
          )}
        </div>

        {/* Overall Rating Box */}
        <div className="text-center shrink-0">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-inner">
            <span className="text-xs text-slate-400 leading-none">OVR</span>
            <span className="text-2xl font-black text-amber-400 font-mono-stats leading-none mt-0.5">
              {player.overallRating}
            </span>
          </div>
        </div>
      </div>

      {/* Rating Breakdown Bars */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
        <div className="text-center">
          <div className="text-[10px] text-slate-400">BAT</div>
          <div className="font-bold font-mono-stats text-slate-200 mt-0.5">{player.battingRating}</div>
        </div>
        <div className="text-center border-x border-slate-800">
          <div className="text-[10px] text-slate-400">BOWL</div>
          <div className="font-bold font-mono-stats text-slate-200 mt-0.5">{player.bowlingRating}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400">FIELD</div>
          <div className="font-bold font-mono-stats text-slate-200 mt-0.5">{player.fieldingRating}</div>
        </div>
      </div>

      {/* Real IPL Career Statistics */}
      <div className="border-t border-slate-800/80 pt-3 text-xs">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
          IPL Career Record
        </div>
        <div className="grid grid-cols-4 gap-2 text-center font-mono-stats">
          <div>
            <div className="text-[10px] text-slate-400">MAT</div>
            <div className="font-semibold text-slate-200">{player.stats.matches}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">RUNS</div>
            <div className="font-semibold text-slate-200">{player.stats.runs}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">AVG / SR</div>
            <div className="font-semibold text-slate-200">
              {player.stats.battingAvg} / {player.stats.strikeRate}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">WKTS / ECON</div>
            <div className="font-semibold text-slate-200">
              {player.stats.wickets} / {player.stats.economy || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing / Team status */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400">Base Price: </span>
          <span className="font-bold text-slate-200 font-mono-stats">
            ₹{player.basePriceCr.toFixed(2)} Cr
          </span>
        </div>

        {team ? (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sold:</span>
            <span
              className="font-bold px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: `${team.primaryColor}25`, color: team.primaryColor }}
            >
              {team.id} (₹{player.soldPriceCr?.toFixed(2)} Cr)
            </span>
          </div>
        ) : (
          <span className="text-amber-400 font-medium">In Auction Pool</span>
        )}
      </div>
    </div>
  );
};

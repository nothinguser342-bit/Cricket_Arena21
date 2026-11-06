import React, { useState, useMemo } from 'react';
import { Player, PlayerRole, PlayerTier } from '../types/cricket';
import { REAL_IPL_PLAYERS } from '../data/players';
import { PlayerCard } from './PlayerCard';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

export const DatabaseBrowser: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole | 'ALL'>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'IND' | 'OS'>('ALL');
  const [selectedTier, setSelectedTier] = useState<PlayerTier | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'RATING' | 'PRICE' | 'RUNS' | 'WICKETS'>('RATING');

  const filteredPlayers = useMemo(() => {
    return REAL_IPL_PLAYERS.filter((p) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCountry = p.country.toLowerCase().includes(query);
        if (!matchesName && !matchesCountry) return false;
      }

      if (selectedRole !== 'ALL' && p.role !== selectedRole) return false;
      if (selectedTier !== 'ALL' && p.tier !== selectedTier) return false;

      if (selectedCountry === 'IND' && p.isOverseas) return false;
      if (selectedCountry === 'OS' && !p.isOverseas) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'RATING') return b.overallRating - a.overallRating;
      if (sortBy === 'PRICE') return b.basePriceCr - a.basePriceCr;
      if (sortBy === 'RUNS') return b.stats.runs - a.stats.runs;
      if (sortBy === 'WICKETS') return b.stats.wickets - a.stats.wickets;
      return 0;
    });
  }, [search, selectedRole, selectedCountry, selectedTier, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-condensed tracking-wide">
            VERIFIED IPL CRICKET DATABASE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real career statistics, specialized ratings, and auction tiers for all {REAL_IPL_PLAYERS.length} pro players.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {filteredPlayers.length} of {REAL_IPL_PLAYERS.length} players
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Roles</option>
              <option value="BAT">Batters</option>
              <option value="WK">Wicketkeepers</option>
              <option value="AR">All-Rounders</option>
              <option value="BOWL">Bowlers</option>
            </select>
          </div>

          {/* Nationality Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Origin:</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Players</option>
              <option value="IND">Indian Capped/Uncapped</option>
              <option value="OS">Overseas Stars</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono-stats"
            >
              <option value="RATING">Highest Rating (OVR)</option>
              <option value="PRICE">Base Price (₹ Cr)</option>
              <option value="RUNS">Most Runs</option>
              <option value="WICKETS">Most Wickets</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
};

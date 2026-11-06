import React, { useState } from 'react';
import { FranchiseId, MatchData, RoomState } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import {
  Trophy,
  Flame,
  Award,
  ChevronRight,
  Play,
  Calendar,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface TournamentViewProps {
  roomState: RoomState;
  currentSocketId: string;
  onSelectMatch: (matchId: string) => void;
  onSimulateAllRemaining?: () => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  roomState,
  currentSocketId,
  onSelectMatch,
}) => {
  const tournament = roomState.tournament;
  const currentManager = roomState.managers.find((m) => m.socketId === currentSocketId);
  const myFranchiseId = currentManager?.franchiseId;

  const [activeTab, setActiveTab] = useState<'table' | 'fixtures' | 'playoffs'>('table');
  const [filterTeam, setFilterTeam] = useState<FranchiseId | 'ALL' | 'MINE' | 'DERBY'>('ALL');

  const matches = tournament.matches || [];
  const pointsTable = tournament.pointsTable || [];

  const filteredMatches = matches.filter((m) => {
    if (filterTeam === 'ALL') return true;
    if (filterTeam === 'MINE') return m.homeTeam === myFranchiseId || m.awayTeam === myFranchiseId;
    if (filterTeam === 'DERBY') {
      const isHomeHuman = !roomState.franchises[m.homeTeam]?.isAI;
      const isAwayHuman = !roomState.franchises[m.awayTeam]?.isAI;
      return isHomeHuman && isAwayHuman;
    }
    return m.homeTeam === filterTeam || m.awayTeam === filterTeam;
  });

  const completedMatchesCount = matches.filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Tournament Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800">
        <div>
          <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">
            Season Tournament Center
          </div>
          <h1 className="text-3xl font-extrabold text-white font-condensed tracking-wide flex items-center gap-2">
            <span>IPL TOURNAMENT & PLAYOFFS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Double/Single round-robin stage leading into official IPL 4-team playoff format.
          </p>
        </div>

        {/* Statistical Leaders: Orange & Purple Caps */}
        <div className="flex items-center gap-4">
          {tournament.orangeCapLeader && (
            <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500 text-slate-950 flex items-center justify-center font-bold text-base shadow-md shadow-orange-500/20">
                🧢
              </div>
              <div>
                <div className="text-[10px] text-orange-400 uppercase font-mono font-bold">
                  Orange Cap
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {tournament.orangeCapLeader.playerName}
                </div>
                <div className="text-xs text-slate-400 font-mono-stats">
                  {tournament.orangeCapLeader.subText} · {tournament.orangeCapLeader.franchiseId}
                </div>
              </div>
            </div>
          )}

          {tournament.purpleCapLeader && (
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500 text-slate-100 flex items-center justify-center font-bold text-base shadow-md shadow-purple-500/20">
                🧢
              </div>
              <div>
                <div className="text-[10px] text-purple-400 uppercase font-mono font-bold">
                  Purple Cap
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {tournament.purpleCapLeader.playerName}
                </div>
                <div className="text-xs text-slate-400 font-mono-stats">
                  {tournament.purpleCapLeader.subText} · {tournament.purpleCapLeader.franchiseId}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'table'
                ? 'text-amber-400 border-b-2 border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Points Table
          </button>

          <button
            onClick={() => setActiveTab('fixtures')}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'fixtures'
                ? 'text-amber-400 border-b-2 border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fixtures & Results ({completedMatchesCount}/{matches.length})
          </button>

          <button
            onClick={() => setActiveTab('playoffs')}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'playoffs'
                ? 'text-amber-400 border-b-2 border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Playoff Bracket
          </button>
        </div>

        {activeTab === 'fixtures' && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="ALL">All Fixtures</option>
              <option value="MINE">My Matches</option>
              <option value="DERBY">⚔️ Friend vs Friend Clashes</option>
              <optgroup label="Filter by Franchise">
                {(Object.keys(IPL_FRANCHISES) as FranchiseId[]).map((id) => (
                  <option key={id} value={id}>
                    {IPL_FRANCHISES[id].name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}
      </div>

      {/* Tab Content 1: Points Table */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Pos</th>
                  <th className="py-3.5 px-4 font-semibold">Franchise</th>
                  <th className="py-3.5 px-4 font-semibold text-center">P</th>
                  <th className="py-3.5 px-4 font-semibold text-center">W</th>
                  <th className="py-3.5 px-4 font-semibold text-center">L</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Pts</th>
                  <th className="py-3.5 px-4 font-semibold text-right">NRR</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Recent Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-stats">
                {pointsTable.map((row, index) => {
                  const f = IPL_FRANCHISES[row.franchiseId];
                  const isTop4 = index < 4;
                  const isMine = myFranchiseId === row.franchiseId;

                  return (
                    <tr
                      key={row.franchiseId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMine ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                            isTop4
                              ? 'bg-amber-500/20 text-amber-400 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-sans font-semibold text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-base">{f.logoSymbol}</span>
                          <span className="text-slate-100">{f.name}</span>
                          {isMine && (
                            <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                          {isTop4 && (
                            <span className="text-[9px] text-emerald-400 uppercase font-mono tracking-wider">
                              Q-Zone
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-300">{row.played}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                        {row.won}
                      </td>
                      <td className="py-3.5 px-4 text-center text-red-400">{row.lost}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-base text-amber-400">
                        {row.points}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold ${
                          row.netRunRate >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {row.netRunRate >= 0 ? `+${row.netRunRate.toFixed(3)}` : row.netRunRate.toFixed(3)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.form.length === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            row.form.slice(-5).map((res, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                  res === 'W'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {res}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Top 4 franchises qualify for Qualifier 1 and Eliminator playoffs.</span>
            </div>
            <span>Official Net Run Rate Formula: (Runs / Overs) - (Runs Conceded / Overs Bowled)</span>
          </div>
        </div>
      )}

      {/* Tab Content 2: Fixtures List */}
      {activeTab === 'fixtures' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map((match) => {
              const home = IPL_FRANCHISES[match.homeTeam];
              const away = IPL_FRANCHISES[match.awayTeam];
              const isCompleted = match.status === 'COMPLETED';

              const isHomeHuman = !roomState.franchises[match.homeTeam]?.isAI;
              const isAwayHuman = !roomState.franchises[match.awayTeam]?.isAI;
              const isHeadToHead = isHomeHuman && isAwayHuman;
              const isMyMatch = myFranchiseId === match.homeTeam || myFranchiseId === match.awayTeam;

              return (
                <div
                  key={match.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isHeadToHead && !isCompleted
                      ? 'bg-gradient-to-br from-slate-900 to-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : isCompleted
                      ? 'bg-slate-900/60 border-slate-800/80'
                      : isMyMatch
                      ? 'bg-slate-900 border-amber-500/40 shadow-sm'
                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/30 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-400">
                        Match #{match.matchNumber} · {match.stage}
                      </span>
                      {isHeadToHead && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⚔️ Friend Derby
                        </span>
                      )}
                    </div>
                    <span className="truncate max-w-[180px]">{match.venue}</span>
                  </div>

                  {/* Teams Row */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{home.logoSymbol}</span>
                        <span className="font-bold text-slate-100">{home.name}</span>
                      </div>
                      {match.innings1 && (
                        <div className="font-mono-stats font-bold text-slate-200">
                          {match.innings1.battingFranchiseId === home.id
                            ? `${match.innings1.totalRuns}/${match.innings1.totalWickets} (${match.innings1.completedOvers}.${match.innings1.ballsInCurrentOver})`
                            : match.innings2
                            ? `${match.innings2.totalRuns}/${match.innings2.totalWickets} (${match.innings2.completedOvers}.${match.innings2.ballsInCurrentOver})`
                            : '-'}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{away.logoSymbol}</span>
                        <span className="font-bold text-slate-100">{away.name}</span>
                      </div>
                      {match.innings1 && (
                        <div className="font-mono-stats font-bold text-slate-200">
                          {match.innings1.battingFranchiseId === away.id
                            ? `${match.innings1.totalRuns}/${match.innings1.totalWickets} (${match.innings1.completedOvers}.${match.innings1.ballsInCurrentOver})`
                            : match.innings2
                            ? `${match.innings2.totalRuns}/${match.innings2.totalWickets} (${match.innings2.completedOvers}.${match.innings2.ballsInCurrentOver})`
                            : '-'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Result or Action */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      {isCompleted ? (
                        <span className="font-semibold text-amber-400">
                          {IPL_FRANCHISES[match.winner!].name} {match.winMargin}
                        </span>
                      ) : (
                        <span className="text-slate-400">Pitch: {match.pitchType}</span>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectMatch(match.id)}
                      className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isCompleted
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isCompleted ? 'Scorecard' : 'Play Match'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 3: Playoff Tree */}
      {activeTab === 'playoffs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 font-condensed tracking-wide mb-6">
              IPL Championship Playoff Road
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Qualifier 1 & Eliminator */}
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-amber-400 uppercase font-mono">
                    Qualifier 1 (Rank 1 vs Rank 2)
                  </div>
                  <div className="text-xs text-slate-300">
                    Winner proceeds directly to The Final. Loser gets second chance in Qualifier 2.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase font-mono">
                    Eliminator (Rank 3 vs Rank 4)
                  </div>
                  <div className="text-xs text-slate-300">
                    Winner advances to Qualifier 2. Loser is knocked out of tournament.
                  </div>
                </div>
              </div>

              {/* Qualifier 2 */}
              <div className="flex flex-col justify-center">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-purple-400 uppercase font-mono">
                    Qualifier 2
                  </div>
                  <div className="text-xs text-slate-300">
                    Loser of Qualifier 1 vs Winner of Eliminator for the final ticket to the title clash.
                  </div>
                </div>
              </div>

              {/* The Grand Final */}
              <div className="flex flex-col justify-center">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/50 space-y-3 text-center">
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                  <div className="text-sm font-extrabold text-amber-400 uppercase font-condensed tracking-wider">
                    The Grand Final
                  </div>
                  <div className="text-xs text-slate-300">
                    Champion crowned with the official IPL Trophy & Celebration!
                  </div>
                  {tournament.champion && (
                    <div className="mt-3 p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-xs font-bold text-amber-400">
                      Champion: {IPL_FRANCHISES[tournament.champion].name} 🏆
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect } from 'react';
import { FranchiseId, MatchData, RoomState, TacticalAggression } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import { sound } from '../utils/audio';
import {
  Play,
  FastForward,
  RotateCcw,
  Trophy,
  Activity,
  Flame,
  Shield,
  ArrowLeft,
  Award,
} from 'lucide-react';

interface LiveMatchViewProps {
  roomState: RoomState;
  matchId: string;
  currentSocketId: string;
  onStepBall: () => void;
  onStepOver: () => void;
  onSimInnings: () => void;
  onSimMatch: () => void;
  onSetTactics: (franchiseId: FranchiseId, aggression: TacticalAggression) => void;
  onReturnToTournament: () => void;
}

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({
  roomState,
  matchId,
  currentSocketId,
  onStepBall,
  onStepOver,
  onSimInnings,
  onSimMatch,
  onSetTactics,
  onReturnToTournament,
}) => {
  const match = roomState.tournament.matches.find((m) => m.id === matchId);
  const currentManager = roomState.managers.find((m) => m.socketId === currentSocketId);
  const myFranchiseId = currentManager?.franchiseId;

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400">
        Match not found.{' '}
        <button onClick={onReturnToTournament} className="text-amber-400 underline">
          Back to tournament
        </button>
      </div>
    );
  }

  const home = IPL_FRANCHISES[match.homeTeam];
  const away = IPL_FRANCHISES[match.awayTeam];

  const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
  const isMatchComplete = match.status === 'COMPLETED';

  // Sound triggers on new ball events
  const latestBall = currentInnings?.ballEvents[0];
  useEffect(() => {
    if (!latestBall) return;
    if (latestBall.isWicket) {
      sound.playWicket();
    } else if (latestBall.isSix || latestBall.isFour) {
      sound.playBatHit(true);
      if (latestBall.isSix) sound.playCheer();
    } else if (latestBall.runsScored > 0) {
      sound.playBatHit(false);
    }
  }, [latestBall?.id]);

  const battingTeamId = currentInnings?.battingFranchiseId;
  const battingFranchise = battingTeamId ? IPL_FRANCHISES[battingTeamId] : null;

  const striker = currentInnings?.batsmen[currentInnings.currentStrikerId];
  const nonStriker = currentInnings?.batsmen[currentInnings.currentNonStrikerId];
  const bowler = currentInnings?.bowlers[currentInnings.currentBowlerId];

  const runRate =
    currentInnings && currentInnings.completedOvers + currentInnings.ballsInCurrentOver / 6 > 0
      ? (
          currentInnings.totalRuns /
          (currentInnings.completedOvers + currentInnings.ballsInCurrentOver / 6)
        ).toFixed(2)
      : '0.00';

  const reqRate =
    currentInnings?.target &&
    120 - (currentInnings.completedOvers * 6 + currentInnings.ballsInCurrentOver) > 0
      ? (
          ((currentInnings.target - currentInnings.totalRuns) /
            (120 - (currentInnings.completedOvers * 6 + currentInnings.ballsInCurrentOver))) *
          6
        ).toFixed(2)
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReturnToTournament}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Tournament Center</span>
        </button>

        <div className="text-xs text-slate-400 font-mono">
          Match #{match.matchNumber} · {match.stage} · {match.venue}
        </div>
      </div>

      {/* Broadcast Scoreboard Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Home Team */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border"
              style={{
                backgroundColor: `${home.primaryColor}20`,
                borderColor: `${home.primaryColor}60`,
                color: home.primaryColor,
              }}
            >
              {home.logoSymbol}
            </div>
            <div>
              <div className="font-extrabold text-xl text-slate-100 font-condensed tracking-wide">
                {home.name}
              </div>
              <div className="text-2xl font-black font-mono-stats text-amber-400">
                {match.innings1?.battingFranchiseId === home.id && match.innings1
                  ? `${match.innings1.totalRuns}/${match.innings1.totalWickets} (${match.innings1.completedOvers}.${match.innings1.ballsInCurrentOver})`
                  : match.innings2?.battingFranchiseId === home.id && match.innings2
                  ? `${match.innings2.totalRuns}/${match.innings2.totalWickets} (${match.innings2.completedOvers}.${match.innings2.ballsInCurrentOver})`
                  : 'Yet to bat'}
              </div>
            </div>
          </div>

          {/* Center VS / Match Status */}
          <div className="text-center">
            {isMatchComplete ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="text-xs font-bold text-amber-400 uppercase font-mono">
                  MATCH RESULT
                </div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  {IPL_FRANCHISES[match.winner!].name} {match.winMargin}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-mono font-semibold">
                  {match.status === 'INNINGS_1' ? '1st Innings' : '2nd Innings Chase'}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-3 font-mono-stats">
                  <span>CRR: {runRate}</span>
                  {reqRate && <span className="text-amber-400">RRR: {reqRate}</span>}
                </div>
                {match.innings2?.target && (
                  <div className="text-xs font-bold text-amber-400 mt-1">
                    Target: {match.innings2.target} (Need{' '}
                    {Math.max(0, match.innings2.target - match.innings2.totalRuns)} off{' '}
                    {Math.max(
                      0,
                      120 -
                        (match.innings2.completedOvers * 6 + match.innings2.ballsInCurrentOver)
                    )}{' '}
                    balls)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-4 flex-row-reverse md:flex-row">
            <div className="text-right">
              <div className="font-extrabold text-xl text-slate-100 font-condensed tracking-wide">
                {away.name}
              </div>
              <div className="text-2xl font-black font-mono-stats text-amber-400">
                {match.innings1?.battingFranchiseId === away.id && match.innings1
                  ? `${match.innings1.totalRuns}/${match.innings1.totalWickets} (${match.innings1.completedOvers}.${match.innings1.ballsInCurrentOver})`
                  : match.innings2?.battingFranchiseId === away.id && match.innings2
                  ? `${match.innings2.totalRuns}/${match.innings2.totalWickets} (${match.innings2.completedOvers}.${match.innings2.ballsInCurrentOver})`
                  : 'Yet to bat'}
              </div>
            </div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border"
              style={{
                backgroundColor: `${away.primaryColor}20`,
                borderColor: `${away.primaryColor}60`,
                color: away.primaryColor,
              }}
            >
              {away.logoSymbol}
            </div>
          </div>
        </div>
      </div>

      {/* Live Ball-by-Ball Simulator Controls (if in progress) */}
      {!isMatchComplete && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Batsmen & Bowler Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Crease Snapshot */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                <span>In The Middle</span>
                <span className="text-emerald-400">● Live Action</span>
              </div>

              {/* Batsmen Table */}
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left font-mono-stats">
                  <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-800 pb-1">
                    <tr>
                      <th className="py-1">Batter</th>
                      <th className="py-1 text-right">R</th>
                      <th className="py-1 text-right">B</th>
                      <th className="py-1 text-right">4s</th>
                      <th className="py-1 text-right">6s</th>
                      <th className="py-1 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {striker && (
                      <tr className="text-slate-100 font-semibold">
                        <td className="py-2 flex items-center gap-1.5">
                          <span className="text-amber-400 text-xs">🏏</span>
                          <span>{striker.name} *</span>
                        </td>
                        <td className="py-2 text-right font-bold text-amber-400">{striker.runs}</td>
                        <td className="py-2 text-right text-slate-300">{striker.balls}</td>
                        <td className="py-2 text-right">{striker.fours}</td>
                        <td className="py-2 text-right">{striker.sixes}</td>
                        <td className="py-2 text-right">
                          {striker.balls > 0
                            ? ((striker.runs / striker.balls) * 100).toFixed(1)
                            : '0.0'}
                        </td>
                      </tr>
                    )}
                    {nonStriker && (
                      <tr className="text-slate-400">
                        <td className="py-2">{nonStriker.name}</td>
                        <td className="py-2 text-right font-semibold text-slate-200">
                          {nonStriker.runs}
                        </td>
                        <td className="py-2 text-right">{nonStriker.balls}</td>
                        <td className="py-2 text-right">{nonStriker.fours}</td>
                        <td className="py-2 text-right">{nonStriker.sixes}</td>
                        <td className="py-2 text-right">
                          {nonStriker.balls > 0
                            ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1)
                            : '0.0'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bowler Strip */}
              {bowler && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-stats">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Bowler</span>
                    <span className="font-bold text-slate-100">{bowler.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-300">
                    <span>
                      {bowler.overs}.{bowler.ballsThisOver} ov
                    </span>
                    <span>{bowler.maidens} mdn</span>
                    <span>{bowler.runsConceded} r</span>
                    <span className="font-bold text-amber-400">{bowler.wickets} w</span>
                    <span className="text-slate-400">
                      Econ:{' '}
                      {bowler.overs + bowler.ballsThisOver / 6 > 0
                        ? (
                            bowler.runsConceded /
                            (bowler.overs + bowler.ballsThisOver / 6)
                          ).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tactical Aggression Selection for Manager */}
            {battingTeamId === myFranchiseId && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  <span>Manager Tactical Instructions</span>
                  <span className="text-slate-400 font-normal">Batting Aggression</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(
                    [
                      { key: 'DEFENSIVE', label: 'Defensive (Anchor)' },
                      { key: 'BALANCED', label: 'Balanced (Rotate)' },
                      { key: 'AGGRESSIVE', label: 'Aggressive (Loft)' },
                      { key: 'MAXIMUM_ATTACK', label: 'Max Attack (Power)' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        if (battingTeamId) onSetTactics(battingTeamId, t.key);
                      }}
                      className="py-2 px-1 rounded-lg border text-center font-semibold transition-all bg-slate-950 border-slate-800 hover:border-amber-500/50 text-slate-200 cursor-pointer"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={onStepBall}
                className="py-3 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Next Ball</span>
              </button>

              <button
                onClick={onStepOver}
                className="py-3 px-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all active:scale-95"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Next Over</span>
              </button>

              <button
                onClick={onSimInnings}
                className="py-3 px-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all active:scale-95"
              >
                <span>Sim Innings</span>
              </button>

              <button
                onClick={onSimMatch}
                className="py-3 px-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/40 transition-all active:scale-95"
              >
                <span>Sim Full Match</span>
              </button>
            </div>
          </div>

          {/* Commentary & Ball Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <span>Live Commentary</span>
              <span>Ball-by-Ball Feed</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 h-[420px] overflow-y-auto space-y-2.5 pr-2">
              {currentInnings?.ballEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Press 'Next Ball' or 'Next Over' to start match action.
                </div>
              ) : (
                currentInnings?.ballEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      ev.isWicket
                        ? 'bg-red-950/30 border-red-500/40 text-red-200'
                        : ev.isSix
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : ev.isFour
                        ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="font-bold text-amber-400">
                        {ev.overIndex}.{ev.ballInOver} · {ev.bowlerName} to {ev.strikerName}
                      </span>
                      <span className="font-extrabold px-1.5 py-0.5 rounded text-[11px] bg-slate-900 border border-slate-800">
                        {ev.isWicket ? 'W' : ev.runsScored}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{ev.commentary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Match Completed Recap & Scorecards */}
      {isMatchComplete && (
        <div className="space-y-6">
          {/* Player of the Match Card */}
          {match.playerOfTheMatch && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg shadow-amber-500/20">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-amber-400 font-mono font-bold">
                    PLAYER OF THE MATCH
                  </div>
                  <div className="text-xl font-bold text-slate-100">
                    {match.playerOfTheMatch.name} ({match.playerOfTheMatch.team})
                  </div>
                  <div className="text-xs text-slate-400 font-mono-stats mt-0.5">
                    {match.playerOfTheMatch.performance}
                  </div>
                </div>
              </div>

              <button
                onClick={onReturnToTournament}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-amber-500/20"
              >
                Return to Standings
              </button>
            </div>
          )}

          {/* Full Detailed Scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Innings 1 Scorecard */}
            {match.innings1 && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-sm text-slate-100">
                    {IPL_FRANCHISES[match.innings1.battingFranchiseId].name} Innings
                  </span>
                  <span className="font-bold font-mono-stats text-amber-400">
                    {match.innings1.totalRuns}/{match.innings1.totalWickets} (
                    {match.innings1.completedOvers}.{match.innings1.ballsInCurrentOver} ov)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono-stats">
                  {Object.values(match.innings1.batsmen)
                    .filter((b) => b.balls > 0 || b.isOut)
                    .map((b) => (
                      <div
                        key={b.playerId}
                        className="flex items-center justify-between py-1 border-b border-slate-800/40 text-slate-300"
                      >
                        <div className="truncate max-w-[170px]">
                          <span className="font-semibold text-slate-100">{b.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {b.dismissal || 'not out'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-100">
                          {b.runs} ({b.balls})
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Innings 2 Scorecard */}
            {match.innings2 && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-sm text-slate-100">
                    {IPL_FRANCHISES[match.innings2.battingFranchiseId].name} Innings
                  </span>
                  <span className="font-bold font-mono-stats text-amber-400">
                    {match.innings2.totalRuns}/{match.innings2.totalWickets} (
                    {match.innings2.completedOvers}.{match.innings2.ballsInCurrentOver} ov)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono-stats">
                  {Object.values(match.innings2.batsmen)
                    .filter((b) => b.balls > 0 || b.isOut)
                    .map((b) => (
                      <div
                        key={b.playerId}
                        className="flex items-center justify-between py-1 border-b border-slate-800/40 text-slate-300"
                      >
                        <div className="truncate max-w-[170px]">
                          <span className="font-semibold text-slate-100">{b.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {b.dismissal || 'not out'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-100">
                          {b.runs} ({b.balls})
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

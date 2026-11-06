import React, { useState } from 'react';
import { FranchiseId, Player, RoomState, TeamSquad } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import { PlayerCard } from './PlayerCard';
import {
  Shield,
  Star,
  Users,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ArrowRight,
  Wand2,
  Save,
} from 'lucide-react';

interface SquadViewProps {
  roomState: RoomState;
  currentSocketId: string;
  onUpdatePlayingXI: (
    franchiseId: FranchiseId,
    playingXI: string[],
    captainId?: string,
    wicketkeeperId?: string,
    impactPlayerId?: string
  ) => void;
  onProceedToTournament: () => void;
}

export const SquadView: React.FC<SquadViewProps> = ({
  roomState,
  currentSocketId,
  onUpdatePlayingXI,
  onProceedToTournament,
}) => {
  const currentManager = roomState.managers.find((m) => m.socketId === currentSocketId);
  const myFranchiseId = currentManager?.franchiseId || 'CSK';
  const isHost = currentManager?.isHost;

  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseId>(myFranchiseId);

  const squad = roomState.franchises[selectedFranchise];
  const isMyFranchise = selectedFranchise === myFranchiseId;

  // Local state for editing Playing XI
  const [selectedXIIds, setSelectedXIIds] = useState<string[]>(
    squad?.playingXI?.length === 11 ? squad.playingXI : []
  );
  const [captainId, setCaptainId] = useState<string | undefined>(squad?.captainId);
  const [keeperId, setKeeperId] = useState<string | undefined>(squad?.wicketkeeperId);

  // Sync state if franchise changes
  React.useEffect(() => {
    const sq = roomState.franchises[selectedFranchise];
    if (sq?.playingXI?.length === 11) {
      setSelectedXIIds(sq.playingXI);
      setCaptainId(sq.captainId);
      setKeeperId(sq.wicketkeeperId);
    } else {
      autoPickXI(sq);
    }
  }, [selectedFranchise]);

  const autoPickXI = (targetSquad: TeamSquad) => {
    if (!targetSquad || targetSquad.players.length === 0) return;
    const sorted = [...targetSquad.players].sort((a, b) => b.overallRating - a.overallRating);

    // 1. Mandatory Wicketkeeper
    const keepers = sorted.filter((p) => p.role === 'WK');
    const bestKeeper = keepers[0] || sorted[0];

    const xi: Player[] = [bestKeeper];
    let overseas = bestKeeper.isOverseas ? 1 : 0;

    for (const p of sorted) {
      if (xi.length >= 11) break;
      if (p.id === bestKeeper.id) continue;
      if (p.isOverseas && overseas >= 4) continue;
      xi.push(p);
      if (p.isOverseas) overseas++;
    }

    // Fill to 11 if needed
    for (const p of sorted) {
      if (xi.length >= 11) break;
      if (!xi.some((x) => x.id === p.id)) {
        xi.push(p);
      }
    }

    const xiIds = xi.map((p) => p.id);
    setSelectedXIIds(xiIds);
    setKeeperId(bestKeeper.id);
    setCaptainId(xi[0].id);
  };

  const handleTogglePlayerInXI = (player: Player) => {
    if (!isMyFranchise) return;

    if (selectedXIIds.includes(player.id)) {
      setSelectedXIIds(selectedXIIds.filter((id) => id !== player.id));
      if (captainId === player.id) setCaptainId(undefined);
      if (keeperId === player.id) setKeeperId(undefined);
    } else {
      if (selectedXIIds.length >= 11) return;
      setSelectedXIIds([...selectedXIIds, player.id]);
      if (player.role === 'WK' && !keeperId) {
        setKeeperId(player.id);
      }
      if (!captainId) {
        setCaptainId(player.id);
      }
    }
  };

  const handleSavePlayingXI = () => {
    onUpdatePlayingXI(selectedFranchise, selectedXIIds, captainId, keeperId);
  };

  const xiPlayers = squad.players.filter((p) => selectedXIIds.includes(p.id));
  const benchPlayers = squad.players.filter((p) => !selectedXIIds.includes(p.id));

  const overseasCount = xiPlayers.filter((p) => p.isOverseas).length;
  const keeperCount = xiPlayers.filter((p) => p.role === 'WK' || p.id === keeperId).length;
  const bowlingOptions = xiPlayers.filter(
    (p) => p.role === 'BOWL' || p.role === 'AR' || p.bowlingRating >= 60
  ).length;

  const isValidXI =
    selectedXIIds.length === 11 &&
    overseasCount <= 4 &&
    keeperCount >= 1 &&
    bowlingOptions >= 5;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Franchise Tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-condensed tracking-wide flex items-center gap-3">
            <span>SQUAD & PLAYING XI SELECTION</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build your optimal tactical XI, designate leadership, and ensure 5+ bowling options.
          </p>
        </div>

        {isHost && (
          <button
            onClick={onProceedToTournament}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <span>START IPL TOURNAMENT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 10 Team Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {(Object.keys(IPL_FRANCHISES) as FranchiseId[]).map((fId) => {
          const f = IPL_FRANCHISES[fId];
          const isSelected = selectedFranchise === fId;
          const isMine = myFranchiseId === fId;

          return (
            <button
              key={fId}
              onClick={() => setSelectedFranchise(fId)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{f.logoSymbol}</span>
              <span>{f.name}</span>
              {isMine && (
                <span className="text-[10px] text-amber-400 font-bold ml-1">YOU</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Squad Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Playing XI & Tactical Balance (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Rules / Validation Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200 uppercase tracking-wide font-condensed">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Playing XI Composition Checklist</span>
              </div>

              {isMyFranchise && (
                <button
                  onClick={() => autoPickXI(squad)}
                  className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Pick Best XI</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div
                className={`p-3 rounded-lg border ${
                  selectedXIIds.length === 11
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[10px] uppercase font-mono">Squad Count</div>
                <div className="text-base font-bold font-mono-stats mt-0.5">
                  {selectedXIIds.length} / 11
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  overseasCount <= 4
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-950/20 border-red-500/40 text-red-400'
                }`}
              >
                <div className="text-[10px] uppercase font-mono">Overseas Limit</div>
                <div className="text-base font-bold font-mono-stats mt-0.5">
                  {overseasCount} / 4 Max
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  keeperCount >= 1
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-950/20 border-red-500/40 text-red-400'
                }`}
              >
                <div className="text-[10px] uppercase font-mono">Wicketkeeper</div>
                <div className="text-base font-bold font-mono-stats mt-0.5">
                  {keeperCount >= 1 ? '✓ Selected' : 'Required'}
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  bowlingOptions >= 5
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-400'
                }`}
              >
                <div className="text-[10px] uppercase font-mono">Bowling Options</div>
                <div className="text-base font-bold font-mono-stats mt-0.5">
                  {bowlingOptions} / 5 Min
                </div>
              </div>
            </div>

            {isMyFranchise && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {isValidXI
                    ? 'Your Playing XI meets all league requirements.'
                    : 'Ensure exactly 11 players, 1 keeper, <= 4 overseas, and 5 bowling options.'}
                </span>

                <button
                  onClick={handleSavePlayingXI}
                  disabled={!isValidXI}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isValidXI
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Playing XI</span>
                </button>
              </div>
            )}
          </div>

          {/* Playing XI List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
              Starting XI (Click to Remove)
            </h3>

            {xiPlayers.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs">
                No players selected in Playing XI yet. Click players from the squad bench to draft them into the XI.
              </div>
            ) : (
              <div className="space-y-2">
                {xiPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    onClick={() => handleTogglePlayerInXI(player)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono-stats text-xs font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-xs text-amber-400 font-mono-stats">
                        {player.overallRating}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                          <span>{player.name}</span>
                          {player.isOverseas && (
                            <span className="text-[10px] text-amber-400">✈</span>
                          )}
                          {captainId === player.id && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 rounded">
                              (C)
                            </span>
                          )}
                          {keeperId === player.id && (
                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 rounded">
                              (WK)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {player.role} · {player.battingStyle} · {player.bowlingStyle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <div className="font-semibold text-slate-200 font-mono-stats">
                        ₹{player.soldPriceCr ? player.soldPriceCr.toFixed(2) : player.basePriceCr.toFixed(2)} Cr
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {player.role === 'BOWL' ? `${player.stats.wickets} W` : `${player.stats.runs} R`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Squad Bench (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
              Squad Bench ({benchPlayers.length} Available)
            </h3>
            <span className="text-xs text-slate-400">
              Total Squad: {squad.players.length}
            </span>
          </div>

          {benchPlayers.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs">
              All squad players have been assigned to the Starting XI.
            </div>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {benchPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  compact={true}
                  onSelect={() => handleTogglePlayerInXI(player)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

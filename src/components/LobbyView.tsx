import React, { useState } from 'react';
import { FranchiseId, RoomConfig, RoomState } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import { Copy, Check, Users, MessageSquare, Play, ShieldAlert, Cpu } from 'lucide-react';

interface LobbyViewProps {
  roomState: RoomState;
  currentSocketId: string;
  onSelectFranchise: (franchiseId: FranchiseId) => void;
  onToggleReady: (isReady: boolean) => void;
  onUpdateConfig: (config: Partial<RoomConfig>) => void;
  onStartAuction: () => void;
  onSendMessage: (text: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  currentSocketId,
  onSelectFranchise,
  onToggleReady,
  onUpdateConfig,
  onStartAuction,
  onSendMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const currentManager = roomState.managers.find((m) => m.socketId === currentSocketId);
  const isHost = currentManager?.isHost;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const humanCount = roomState.managers.length;
  const aiCount = 10 - roomState.managers.filter((m) => m.franchiseId).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-slate-800">
        <div>
          <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">
            Official IPL Mega Auction & Tournament Lobby
          </div>
          <h1 className="text-3xl font-extrabold text-white font-condensed tracking-wide">
            {roomState.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pick your franchise. Remaining slots are operated by realistic tactical AI managers.
          </p>
        </div>

        {/* Room Code & Share */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Room Code</div>
              <div className="text-xl font-bold font-mono tracking-widest text-amber-400">
                {roomState.id}
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Ready Button */}
          {currentManager?.franchiseId && (
            <button
              onClick={() => onToggleReady(!currentManager.isReady)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
                currentManager.isReady
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'
              }`}
            >
              {currentManager.isReady ? '✓ Ready' : 'Mark Ready'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Franchise Selection Grid (10 teams) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-condensed tracking-wide">
              <span>Select Your Franchise</span>
              <span className="text-xs text-slate-400 font-sans font-normal">
                ({humanCount} Human, {aiCount} AI)
              </span>
            </h2>
            <div className="text-xs text-slate-400">
              Each manager operates 1 unique franchise
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(Object.keys(IPL_FRANCHISES) as FranchiseId[]).map((fId) => {
              const franchise = IPL_FRANCHISES[fId];
              const squad = roomState.franchises[fId];
              const isSelectedByMe = currentManager?.franchiseId === fId;
              const isClaimedByOther = !squad.isAI && !isSelectedByMe;

              return (
                <div
                  key={fId}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isSelectedByMe
                      ? 'bg-slate-900 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                      : isClaimedByOther
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center text-xl font-bold border shrink-0"
                        style={{
                          backgroundColor: `${franchise.primaryColor}20`,
                          borderColor: `${franchise.primaryColor}60`,
                          color: franchise.primaryColor,
                        }}
                      >
                        {franchise.logoSymbol}
                      </div>
                      <div>
                        <div className="font-bold text-base text-slate-100 flex items-center gap-2">
                          <span>{franchise.name}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {franchise.city} · {franchise.titles} Titles
                        </div>
                      </div>
                    </div>

                    {/* Claim / Select Button */}
                    <div>
                      {isSelectedByMe ? (
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md">
                          Your Team
                        </span>
                      ) : isClaimedByOther ? (
                        <span className="text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-md">
                          {squad.managerName}
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectFranchise(fId)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Take Charge
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Manager and Home Venue */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <div className="truncate max-w-[190px]">
                      {squad.isAI ? (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Cpu className="w-3 h-3 text-slate-400" />
                          <span>AI: {franchise.aiBotName}</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">
                          Manager: {squad.managerName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {franchise.homeVenue.split(',')[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Host Settings, Managers, & Live Chat */}
        <div className="space-y-6">
          {/* Host Controls */}
          {isHost && (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 font-mono">
                Host Room Settings
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Starting Purse: ₹{roomState.config.initialPurseCr} Crores
                  </label>
                  <div className="flex gap-2">
                    {[100, 120, 150].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => onUpdateConfig({ initialPurseCr: amt })}
                        className={`flex-1 py-1.5 rounded border text-xs font-mono-stats ${
                          roomState.config.initialPurseCr === amt
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        ₹{amt} Cr
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Auction Bid Timer: {roomState.config.bidTimerSeconds}s
                  </label>
                  <div className="flex gap-2">
                    {[8, 12, 16].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => onUpdateConfig({ bidTimerSeconds: sec })}
                        className={`flex-1 py-1.5 rounded border text-xs font-mono-stats ${
                          roomState.config.bidTimerSeconds === sec
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    League Format
                  </label>
                  <div className="flex gap-2">
                    {[
                      { key: 'CONDENSED', label: 'Single Round (9 Matches)' },
                      { key: 'FULL', label: 'Full Double (18 Matches)' },
                    ].map((fmt) => (
                      <button
                        key={fmt.key}
                        onClick={() =>
                          onUpdateConfig({ leagueLength: fmt.key as 'CONDENSED' | 'FULL' })
                        }
                        className={`flex-1 py-1.5 px-2 rounded border text-[11px] truncate ${
                          roomState.config.leagueLength === fmt.key
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={onStartAuction}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START MEGA AUCTION</span>
              </button>
            </div>
          )}

          {/* Lobby Live Chat */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col h-80">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3 border-b border-slate-800 pb-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Lobby Feed & Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {roomState.chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg ${
                    msg.type === 'system'
                      ? 'bg-slate-950/70 text-slate-400 border border-slate-800/80'
                      : 'bg-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-amber-400">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Message managers..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  FranchiseId,
  MatchData,
  RoomConfig,
  RoomState,
  TacticalAggression,
} from './types/cricket';
import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { AuctionView } from './components/AuctionView';
import { SquadView } from './components/SquadView';
import { TournamentView } from './components/TournamentView';
import { LiveMatchView } from './components/LiveMatchView';
import { TrophyRoomView } from './components/TrophyRoomView';
import { DatabaseBrowser } from './components/DatabaseBrowser';
import { IPL_FRANCHISES } from './data/teams';
import {
  Trophy,
  Users,
  Play,
  Plus,
  LogIn,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSocketId, setCurrentSocketId] = useState<string>('');

  // Navigation & Active Room State
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [activeTab, setActiveTab] = useState<
    'lobby' | 'auction' | 'squads' | 'tournament' | 'match' | 'trophy' | 'database'
  >('lobby');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Home / Room join inputs
  const [managerName, setManagerName] = useState(() => {
    return localStorage.getItem('ipl_manager_name') || 'Manager ' + Math.floor(100 + Math.random() * 900);
  });
  const [roomName, setRoomName] = useState('IPL 2025 Mega Auction Arena');
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<
    Array<{ id: string; name: string; hostName: string; playersCount: number; status: string }>
  >([]);

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Socket setup
  useEffect(() => {
    const s = io({
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
      setCurrentSocketId(s.id || '');
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('room:joined', ({ roomId, state }: { roomId: string; state: RoomState }) => {
      setRoomState(state);
      localStorage.setItem('ipl_room_id', roomId);
      localStorage.setItem('ipl_manager_name', managerName);

      // Route to correct tab according to room status
      if (state.status === 'AUCTION') setActiveTab('auction');
      else if (state.status === 'SQUADS') setActiveTab('squads');
      else if (state.status === 'TOURNAMENT') setActiveTab('tournament');
      else if (state.status === 'MATCH' && state.activeMatchId) {
        setSelectedMatchId(state.activeMatchId);
        setActiveTab('match');
      } else if (state.status === 'TROPHY') setActiveTab('trophy');
      else setActiveTab('lobby');
    });

    s.on('room:state', (newState: RoomState) => {
      setRoomState(newState);

      // Automatically transition if room advances
      if (newState.status === 'AUCTION' && activeTab === 'lobby') {
        setActiveTab('auction');
      } else if (newState.status === 'SQUADS' && activeTab === 'auction') {
        setActiveTab('squads');
      } else if (newState.status === 'MATCH' && newState.activeMatchId) {
        setSelectedMatchId(newState.activeMatchId);
        setActiveTab('match');
      } else if (newState.status === 'TROPHY') {
        setActiveTab('trophy');
      }
    });

    s.on('room:toast', ({ type, message }: { type: 'error' | 'success'; message: string }) => {
      showToast(type, message);
    });

    s.on('room:error', ({ message }: { message: string }) => {
      showToast('error', message);
    });

    s.on('rooms:updated', (rooms) => {
      setPublicRooms(rooms);
    });

    setSocket(s);

    // Initial fetch of public rooms
    fetch('/api/rooms')
      .then((r) => r.json())
      .then((data) => setPublicRooms(data))
      .catch(() => {});

    return () => {
      s.disconnect();
    };
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !managerName.trim()) return;
    socket.emit('room:create', { name: roomName, managerName });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !joinCode.trim() || !managerName.trim()) return;
    socket.emit('room:join', { roomId: joinCode.trim().toUpperCase(), managerName });
  };

  const handleQuickJoin = (roomId: string) => {
    if (!socket || !managerName.trim()) return;
    socket.emit('room:join', { roomId, managerName });
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('ipl_room_id');
    setRoomState(null);
    setActiveTab('lobby');
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  // Lobby actions
  const handleSelectFranchise = (franchiseId: FranchiseId) => {
    if (!socket || !roomState) return;
    socket.emit('room:selectFranchise', { roomId: roomState.id, franchiseId });
  };

  const handleToggleReady = (isReady: boolean) => {
    if (!socket || !roomState) return;
    socket.emit('room:ready', { roomId: roomState.id, isReady });
  };

  const handleUpdateConfig = (config: Partial<RoomConfig>) => {
    if (!socket || !roomState) return;
    socket.emit('room:config', { roomId: roomState.id, config });
  };

  const handleStartAuction = () => {
    if (!socket || !roomState) return;
    socket.emit('auction:start', { roomId: roomState.id });
    setActiveTab('auction');
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !roomState) return;
    socket.emit('chat:send', { roomId: roomState.id, text, sender: managerName });
  };

  // Auction actions
  const handlePlaceBid = (customAmount?: number) => {
    if (!socket || !roomState) return;
    socket.emit('auction:bid', { roomId: roomState.id, customAmount });
  };

  const handlePauseAuction = () => {
    if (!socket || !roomState) return;
    socket.emit('auction:pause', { roomId: roomState.id });
  };

  const handleResumeAuction = () => {
    if (!socket || !roomState) return;
    socket.emit('auction:resume', { roomId: roomState.id });
  };

  const handleFastForwardAuction = () => {
    if (!socket || !roomState) return;
    socket.emit('auction:fastForward', { roomId: roomState.id });
  };

  const handleProceedToSquads = () => {
    setActiveTab('squads');
  };

  // Squad actions
  const handleUpdatePlayingXI = (
    franchiseId: FranchiseId,
    playingXI: string[],
    captainId?: string,
    wicketkeeperId?: string,
    impactPlayerId?: string
  ) => {
    if (!socket || !roomState) return;
    socket.emit('squad:updateXI', {
      roomId: roomState.id,
      franchiseId,
      playingXI,
      captainId,
      wicketkeeperId,
      impactPlayerId,
    });
  };

  const handleProceedToTournament = () => {
    if (!socket || !roomState) return;
    socket.emit('tournament:proceed', { roomId: roomState.id });
    setActiveTab('tournament');
  };

  // Match actions
  const handleSelectMatch = (matchId: string) => {
    if (!socket || !roomState) return;
    setSelectedMatchId(matchId);
    socket.emit('match:start', { roomId: roomState.id, matchId });
    setActiveTab('match');
  };

  const handleStepBall = () => {
    if (!socket || !roomState) return;
    socket.emit('match:stepBall', { roomId: roomState.id });
  };

  const handleStepOver = () => {
    if (!socket || !roomState) return;
    socket.emit('match:stepOver', { roomId: roomState.id });
  };

  const handleSimInnings = () => {
    if (!socket || !roomState) return;
    socket.emit('match:simInnings', { roomId: roomState.id });
  };

  const handleSimMatch = () => {
    if (!socket || !roomState) return;
    socket.emit('match:simMatch', { roomId: roomState.id });
  };

  const handleSetTactics = (franchiseId: FranchiseId, aggression: TacticalAggression) => {
    if (!socket || !roomState) return;
    socket.emit('match:tactics', { roomId: roomState.id, franchiseId, aggression });
  };

  const handleReturnToTournament = () => {
    if (!socket || !roomState) return;
    socket.emit('match:returnTournament', { roomId: roomState.id });
    setSelectedMatchId(null);
    setActiveTab('tournament');
  };

  // If user is not yet in a room, render the Welcome / Join Lobby Screen
  if (!roomState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar currentTab="lobby" onSelectTab={(t) => setActiveTab(t as any)} />

        <main className="flex-1 max-w-6xl mx-auto px-4 py-12 w-full space-y-12">
          {/* Hero Pitch */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multiplayer Cricket Management & Simulation</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white font-condensed tracking-wide uppercase">
              IPL Mega Auction & Tournament Arena
            </h1>
            <p className="text-base text-slate-400">
              Gather your friends, take charge of an official IPL franchise, battle in a synchronized real-time auction with intelligent AI managers, set tactical line-ups, and compete in the ultimate IPL championship!
            </p>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div
              className={`max-w-md mx-auto p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xl transition-all ${
                toast.type === 'error'
                  ? 'bg-red-950 border border-red-500 text-red-200'
                  : 'bg-emerald-950 border border-emerald-500 text-emerald-200'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Manager Profile & Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Create Room Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 font-condensed tracking-wide">
                    Create New IPL Room
                  </h2>
                  <p className="text-xs text-slate-400">
                    Host a room with custom purse (default ₹120 Cr) and rules.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Your Manager Name</label>
                  <input
                    type="text"
                    required
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="e.g. MS Dhoni Fan, Coach Dravid"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Room Title</label>
                  <input
                    type="text"
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Friends Mega Auction 2025"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Create Room & Enter Lobby
                </button>
              </form>
            </div>

            {/* Join Room Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 font-condensed tracking-wide">
                    Join with Room Code
                  </h2>
                  <p className="text-xs text-slate-400">
                    Connect with your friends using their room code.
                  </p>
                </div>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Your Manager Name</label>
                  <input
                    type="text"
                    required
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="e.g. Rohit Sharma Bot"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Room Code</label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. IPL-4281"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 uppercase tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  Join Room
                </button>
              </form>
            </div>
          </div>

          {/* Active Public Rooms */}
          {publicRooms.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Active Public Rooms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {publicRooms.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-100">{r.name}</div>
                      <div className="text-xs text-slate-400">
                        Host: {r.hostName} · Code: <span className="font-mono text-amber-400">{r.id}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickJoin(r.id)}
                      className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-900">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
              <div className="text-amber-400 font-bold text-sm font-condensed uppercase">
                10 Real IPL Franchises
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                CSK, MI, RCB, KKR, SRH, RR, DC, PBKS, GT & LSG. If fewer than 10 friends join, tactical AI managers step up.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
              <div className="text-amber-400 font-bold text-sm font-condensed uppercase">
                Synchronized Mega Auction
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live hammer countdown, real-time purse deduction, base price increments, and intelligent AI bidding.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
              <div className="text-amber-400 font-bold text-sm font-condensed uppercase">
                Ball-by-Ball T20 Match Engine
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pitch conditions, powerplay & death overs, batting aggression tactics, bowling changes, and official NRR points table.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // When room is active, render the main application view
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'tournament' && roomState.status === 'MATCH' && selectedMatchId) {
            setActiveTab('match');
          } else {
            setActiveTab(tab);
          }
        }}
        roomCode={roomState.id}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Global Toast */}
      {toast && (
        <div className="fixed top-16 right-6 z-50">
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl transition-all ${
              toast.type === 'error'
                ? 'bg-red-950 border border-red-500 text-red-200'
                : 'bg-emerald-950 border border-emerald-500 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Tab Routing */}
      <main className="flex-1 pb-16">
        {activeTab === 'lobby' && (
          <LobbyView
            roomState={roomState}
            currentSocketId={currentSocketId}
            onSelectFranchise={handleSelectFranchise}
            onToggleReady={handleToggleReady}
            onUpdateConfig={handleUpdateConfig}
            onStartAuction={handleStartAuction}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'auction' && (
          <AuctionView
            roomState={roomState}
            currentSocketId={currentSocketId}
            onPlaceBid={handlePlaceBid}
            onPauseAuction={handlePauseAuction}
            onResumeAuction={handleResumeAuction}
            onFastForward={handleFastForwardAuction}
            onProceedToSquads={handleProceedToSquads}
          />
        )}

        {activeTab === 'squads' && (
          <SquadView
            roomState={roomState}
            currentSocketId={currentSocketId}
            onUpdatePlayingXI={handleUpdatePlayingXI}
            onProceedToTournament={handleProceedToTournament}
          />
        )}

        {activeTab === 'tournament' && (
          <TournamentView
            roomState={roomState}
            currentSocketId={currentSocketId}
            onSelectMatch={handleSelectMatch}
          />
        )}

        {activeTab === 'match' && selectedMatchId && (
          <LiveMatchView
            roomState={roomState}
            matchId={selectedMatchId}
            currentSocketId={currentSocketId}
            onStepBall={handleStepBall}
            onStepOver={handleStepOver}
            onSimInnings={handleSimInnings}
            onSimMatch={handleSimMatch}
            onSetTactics={handleSetTactics}
            onReturnToTournament={handleReturnToTournament}
          />
        )}

        {activeTab === 'trophy' && (
          <TrophyRoomView
            roomState={roomState}
            onResetSeason={() => setActiveTab('lobby')}
            onBackToTournament={() => setActiveTab('tournament')}
          />
        )}

        {activeTab === 'database' && <DatabaseBrowser />}
      </main>
    </div>
  );
}

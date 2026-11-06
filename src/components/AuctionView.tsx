import React, { useEffect } from 'react';
import { AuctionState, FranchiseId, RoomState } from '../types/cricket';
import { IPL_FRANCHISES } from '../data/teams';
import { PlayerCard } from './PlayerCard';
import { sound } from '../utils/audio';
import {
  Gavel,
  Pause,
  Play,
  FastForward,
  Clock,
  ArrowRight,
  TrendingUp,
  Shield,
  CheckCircle,
} from 'lucide-react';

interface AuctionViewProps {
  roomState: RoomState;
  currentSocketId: string;
  onPlaceBid: (customAmount?: number) => void;
  onPauseAuction: () => void;
  onResumeAuction: () => void;
  onFastForward: () => void;
  onProceedToSquads: () => void;
}

export const AuctionView: React.FC<AuctionViewProps> = ({
  roomState,
  currentSocketId,
  onPlaceBid,
  onPauseAuction,
  onResumeAuction,
  onFastForward,
  onProceedToSquads,
}) => {
  const auction = roomState.auction;
  const currentManager = roomState.managers.find((m) => m.socketId === currentSocketId);
  const myFranchiseId = currentManager?.franchiseId;
  const isHost = currentManager?.isHost;

  const currentFranchise = auction.highestBidder
    ? IPL_FRANCHISES[auction.highestBidder]
    : null;

  const mySquad = myFranchiseId ? roomState.franchises[myFranchiseId] : null;

  // Sound effects on state events
  useEffect(() => {
    if (auction.bidHistory.length > 0) {
      sound.playBid();
    }
  }, [auction.currentBidCr]);

  useEffect(() => {
    if (auction.soldHistory.length > 0) {
      sound.playGavel();
    }
  }, [auction.soldHistory.length]);

  const calculateNextMinBid = () => {
    if (!auction.currentPlayer) return 0;
    if (auction.highestBidder === null) return auction.currentPlayer.basePriceCr;
    const current = auction.currentBidCr;
    let inc = 0.2;
    if (current >= 10.0) inc = 1.0;
    else if (current >= 5.0) inc = 0.5;
    else if (current >= 2.0) inc = 0.25;
    return parseFloat((current + inc).toFixed(2));
  };

  const nextMinBid = calculateNextMinBid();
  const isMyBidHighest = auction.highestBidder === myFranchiseId;

  // Timer urgency
  const isUrgent = auction.timerSeconds <= 4 && auction.timerSeconds > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar: Category, Total Progress, Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-lg text-slate-100 font-condensed tracking-wider">
              IPL MEGA AUCTION
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-300">
            Set: <span className="font-semibold text-amber-400">{auction.currentCategory}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-400 font-mono-stats">
            Player {auction.currentPlayerIndex + 1}
          </div>
        </div>

        {/* Host Controls */}
        <div className="flex items-center gap-2">
          {isHost && (
            <>
              {auction.status === 'PAUSED' ? (
                <button
                  onClick={onResumeAuction}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={onPauseAuction}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={onFastForward}
                title="Fast forward gavel"
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Hammer Down</span>
              </button>
            </>
          )}

          {/* Finish / Proceed to Squads if finished or host override */}
          {isHost && (
            <button
              onClick={onProceedToSquads}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <span>Manage Squads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Auction Floor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player on the Hammer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
            <span>On The Hammer</span>
            {auction.status === 'ACTIVE' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Bidding Live</span>
              </span>
            )}
          </div>

          {auction.currentPlayer ? (
            <PlayerCard player={auction.currentPlayer} isSelected={true} />
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
              <Gavel className="w-12 h-12 mx-auto text-amber-500/50" />
              <div className="font-semibold text-slate-200">
                {auction.status === 'COMPLETED'
                  ? 'Mega Auction Concluded!'
                  : 'Preparing next player for auction...'}
              </div>
              <div className="text-xs text-slate-500">
                The auctioneer will present the next candidate shortly.
              </div>
            </div>
          )}

          {/* Recent Sold Ticker */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Recent Hammer Results
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {auction.soldHistory.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">No players sold yet.</div>
              ) : (
                auction.soldHistory
                  .slice(-5)
                  .reverse()
                  .map((sold, idx) => {
                    const f = IPL_FRANCHISES[sold.winningFranchiseId];
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{sold.player.name}</span>
                          <span
                            className="font-bold px-1.5 py-0.2 rounded text-[10px]"
                            style={{ backgroundColor: `${f.primaryColor}20`, color: f.primaryColor }}
                          >
                            {f.id}
                          </span>
                        </div>
                        <span className="font-bold text-amber-400 font-mono-stats">
                          ₹{sold.priceCr.toFixed(2)} Cr
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Column: Live Bid Arena (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Bid Display Box */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              currentFranchise
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950'
                : 'bg-slate-900/90'
            } border-slate-800 relative overflow-hidden`}
          >
            {/* Top Row: Timer & Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-mono">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Countdown Timer</span>
              </div>

              {/* Big Animated Timer */}
              <div
                className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-base font-bold font-mono-stats ${
                  isUrgent
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : 'bg-slate-800 text-amber-400 border border-slate-700'
                }`}
              >
                <span>{auction.timerSeconds}s</span>
              </div>
            </div>

            {/* Current Highest Bid */}
            <div className="text-center py-6 border-y border-slate-800/80 my-2">
              <div className="text-xs text-slate-400 uppercase tracking-widest font-mono mb-1">
                {auction.highestBidder ? 'Current Highest Bid' : 'Starting Base Price'}
              </div>
              <div className="text-5xl md:text-6xl font-black text-amber-400 font-mono-stats tracking-tight">
                ₹{auction.currentBidCr.toFixed(2)}{' '}
                <span className="text-2xl font-bold text-slate-400">Crores</span>
              </div>

              {/* Leading Team Banner */}
              {currentFranchise ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div
                    className="px-3.5 py-1.5 rounded-lg border flex items-center gap-2 text-sm font-bold"
                    style={{
                      backgroundColor: `${currentFranchise.primaryColor}20`,
                      borderColor: `${currentFranchise.primaryColor}50`,
                      color: currentFranchise.primaryColor,
                    }}
                  >
                    <span>{currentFranchise.logoSymbol}</span>
                    <span>{currentFranchise.name}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({auction.highestBidderName})
                    </span>
                  </div>
                  {isMyBidHighest && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 rounded-md">
                      ✓ Your Bid
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-3 font-medium">
                  Awaiting first paddle raise...
                </div>
              )}
            </div>

            {/* Quick Action Bidding Controls for User */}
            <div className="mt-6 space-y-3">
              {myFranchiseId ? (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                    <span>Your Franchise: {IPL_FRANCHISES[myFranchiseId].name}</span>
                    <span>Purse: ₹{mySquad?.purseRemainingCr.toFixed(2)} Cr</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => onPlaceBid()}
                      disabled={
                        auction.status !== 'ACTIVE' ||
                        !auction.currentPlayer ||
                        isMyBidHighest ||
                        (mySquad?.purseRemainingCr || 0) < nextMinBid
                      }
                      className={`py-4 px-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center ${
                        isMyBidHighest
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95'
                      }`}
                    >
                      <span className="text-[11px] font-mono uppercase tracking-wider">
                        {isMyBidHighest ? 'Highest Bidder' : 'Next Minimum Bid'}
                      </span>
                      <span className="text-lg font-mono-stats font-extrabold">
                        ₹{nextMinBid.toFixed(2)} Cr
                      </span>
                    </button>

                    <button
                      onClick={() => onPlaceBid(parseFloat((nextMinBid + 0.5).toFixed(2)))}
                      disabled={
                        auction.status !== 'ACTIVE' ||
                        !auction.currentPlayer ||
                        (mySquad?.purseRemainingCr || 0) < nextMinBid + 0.5
                      }
                      className="py-4 px-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95"
                    >
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        +50 Lakhs Jump
                      </span>
                      <span className="text-lg font-mono-stats font-extrabold text-amber-400">
                        ₹{(nextMinBid + 0.5).toFixed(2)} Cr
                      </span>
                    </button>

                    <button
                      onClick={() => onPlaceBid(parseFloat((nextMinBid + 1.0).toFixed(2)))}
                      disabled={
                        auction.status !== 'ACTIVE' ||
                        !auction.currentPlayer ||
                        (mySquad?.purseRemainingCr || 0) < nextMinBid + 1.0
                      }
                      className="py-4 px-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95"
                    >
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        +1.00 Cr Jump
                      </span>
                      <span className="text-lg font-mono-stats font-extrabold text-amber-400">
                        ₹{(nextMinBid + 1.0).toFixed(2)} Cr
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs text-amber-400">
                  Select a franchise in the Lobby to place live bids.
                </div>
              )}
            </div>
          </div>

          {/* Franchise Purse & Squad Dashboard (All 10 Franchises) */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <span>Franchise Purse & Squad Tracker</span>
              <span>10 Teams</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {(Object.keys(IPL_FRANCHISES) as FranchiseId[]).map((fId) => {
                const franchise = IPL_FRANCHISES[fId];
                const squad = roomState.franchises[fId];
                const isLeading = auction.highestBidder === fId;
                const isMine = myFranchiseId === fId;

                const overseasCount = squad.players.filter((p) => p.isOverseas).length;

                return (
                  <div
                    key={fId}
                    className={`p-2.5 rounded-lg border text-xs transition-all ${
                      isLeading
                        ? 'bg-amber-950/30 border-amber-500'
                        : isMine
                        ? 'bg-slate-800/80 border-slate-600'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span style={{ color: franchise.primaryColor }}>{franchise.id}</span>
                      {isMine && <span className="text-[9px] text-amber-400">YOU</span>}
                    </div>

                    <div className="font-bold text-slate-200 font-mono-stats">
                      ₹{squad.purseRemainingCr.toFixed(1)} Cr
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{squad.players.length} plyrs</span>
                      <span>{overseasCount}/8 OS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

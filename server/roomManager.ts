import { Server, Socket } from 'socket.io';
import {
  FranchiseId,
  ManagerInfo,
  MatchData,
  Player,
  PlayerRole,
  RoomConfig,
  RoomState,
  TacticalAggression,
  TeamSquad,
} from '../src/types/cricket';
import { IPL_FRANCHISES } from '../src/data/teams';
import { REAL_IPL_PLAYERS } from '../src/data/players';
import { AuctionEngine } from './auctionEngine';
import { TournamentEngine } from './tournamentEngine';
import { SimulationEngine } from './simulationEngine';

export class RoomInstance {
  public id: string;
  public name: string;
  public hostSocketId: string;
  public hostName: string;
  public status: RoomState['status'] = 'LOBBY';
  public config: RoomConfig;
  public franchises: Record<FranchiseId, TeamSquad>;
  public managers: ManagerInfo[] = [];
  public chatMessages: RoomState['chatMessages'] = [];
  public auctionEngine: AuctionEngine | null = null;
  public tournamentEngine: TournamentEngine;
  public activeSimulation: SimulationEngine | null = null;
  public activeMatchId?: string;
  private io: Server;

  constructor(id: string, name: string, hostSocketId: string, hostName: string, io: Server) {
    this.id = id;
    this.name = name;
    this.hostSocketId = hostSocketId;
    this.hostName = hostName;
    this.io = io;

    this.config = {
      initialPurseCr: 120.0,
      bidTimerSeconds: 12,
      minSquadSize: 15,
      maxSquadSize: 25,
      maxOverseasInSquad: 8,
      maxOverseasInXI: 4,
      leagueLength: 'CONDENSED',
    };

    // Initialize all 10 franchises with default AI managers
    this.franchises = this.createInitialFranchises();
    this.tournamentEngine = new TournamentEngine(this.config);

    this.addSystemMessage(`Room created by ${hostName}. All 10 IPL franchises loaded.`);
  }

  private createInitialFranchises(): Record<FranchiseId, TeamSquad> {
    const fIds: FranchiseId[] = [
      'CSK',
      'MI',
      'RCB',
      'KKR',
      'SRH',
      'RR',
      'DC',
      'PBKS',
      'GT',
      'LSG',
    ];

    const result = {} as Record<FranchiseId, TeamSquad>;
    for (const id of fIds) {
      const f = IPL_FRANCHISES[id];
      result[id] = {
        franchiseId: id,
        purseRemainingCr: this.config.initialPurseCr,
        purseSpentCr: 0,
        players: [],
        playingXI: [],
        bowlerOrder: [],
        managerName: f.aiBotName,
        isAI: true,
        isReady: true,
      };
    }
    return result;
  }

  public getPublicState(): RoomState {
    return {
      id: this.id,
      name: this.name,
      hostSocketId: this.hostSocketId,
      hostName: this.hostName,
      status: this.status,
      config: this.config,
      franchises: this.franchises,
      managers: this.managers,
      chatMessages: this.chatMessages.slice(-50),
      auction: this.auctionEngine
        ? this.auctionEngine.getState()
        : {
            status: 'PENDING',
            currentCategory: 'MARQUEE',
            currentPlayerIndex: 0,
            currentPlayer: null,
            currentBidCr: 0,
            highestBidder: null,
            highestBidderName: null,
            timerSeconds: this.config.bidTimerSeconds,
            bidHistory: [],
            soldHistory: [],
            unsoldPlayerIds: [],
            totalPlayersAuctioned: 0,
          },
      tournament: this.tournamentEngine.getState(),
      activeMatchId: this.activeMatchId,
    };
  }

  public broadcastUpdate() {
    this.io.to(this.id).emit('room:state', this.getPublicState());
  }

  public addSystemMessage(text: string) {
    this.chatMessages.push({
      id: `sys_${Date.now()}_${Math.random()}`,
      sender: 'Match Referee',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    });
  }

  public addChatMessage(sender: string, text: string) {
    this.chatMessages.push({
      id: `chat_${Date.now()}_${Math.random()}`,
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    });
    this.broadcastUpdate();
  }

  public joinManager(socketId: string, userId: string, name: string): ManagerInfo {
    let mgr = this.managers.find((m) => m.userId === userId || m.socketId === socketId);
    if (!mgr) {
      mgr = {
        socketId,
        userId,
        name,
        isReady: false,
        isHost: this.managers.length === 0 || socketId === this.hostSocketId,
      };
      this.managers.push(mgr);
      this.addSystemMessage(`${name} joined the room.`);
    } else {
      mgr.socketId = socketId;
      mgr.name = name;
    }

    this.broadcastUpdate();
    return mgr;
  }

  public leaveManager(socketId: string) {
    const mgr = this.managers.find((m) => m.socketId === socketId);
    if (!mgr) return;

    // If manager claimed a franchise, return it to AI
    if (mgr.franchiseId && this.franchises[mgr.franchiseId]) {
      const f = IPL_FRANCHISES[mgr.franchiseId];
      this.franchises[mgr.franchiseId].isAI = true;
      this.franchises[mgr.franchiseId].managerName = f.aiBotName;
    }

    this.managers = this.managers.filter((m) => m.socketId !== socketId);
    this.addSystemMessage(`${mgr.name} left the room.`);

    // If host left, elect new host
    if (socketId === this.hostSocketId && this.managers.length > 0) {
      this.hostSocketId = this.managers[0].socketId;
      this.hostName = this.managers[0].name;
      this.managers[0].isHost = true;
      this.addSystemMessage(`${this.managers[0].name} is now the host.`);
    }

    this.broadcastUpdate();
  }

  public selectFranchise(socketId: string, franchiseId: FranchiseId): { success: boolean; message: string } {
    const mgr = this.managers.find((m) => m.socketId === socketId);
    if (!mgr) return { success: false, message: 'Manager not in room' };

    // Check if another human already selected this franchise
    const existingClaim = this.managers.find(
      (m) => m.franchiseId === franchiseId && m.socketId !== socketId
    );
    if (existingClaim) {
      return { success: false, message: `${franchiseId} has already been claimed by ${existingClaim.name}` };
    }

    // Release old franchise if any
    if (mgr.franchiseId && this.franchises[mgr.franchiseId]) {
      const oldF = IPL_FRANCHISES[mgr.franchiseId];
      this.franchises[mgr.franchiseId].isAI = true;
      this.franchises[mgr.franchiseId].managerName = oldF.aiBotName;
    }

    // Assign new franchise
    mgr.franchiseId = franchiseId;
    this.franchises[franchiseId].isAI = false;
    this.franchises[franchiseId].managerName = mgr.name;

    this.addSystemMessage(`${mgr.name} took charge of ${IPL_FRANCHISES[franchiseId].name}.`);
    this.broadcastUpdate();

    return { success: true, message: `Selected ${franchiseId}` };
  }

  public setReady(socketId: string, isReady: boolean) {
    const mgr = this.managers.find((m) => m.socketId === socketId);
    if (mgr) {
      mgr.isReady = isReady;
      this.broadcastUpdate();
    }
  }

  public updateConfig(newConfig: Partial<RoomConfig>) {
    this.config = { ...this.config, ...newConfig };
    // Update purse on franchises if still in LOBBY
    if (this.status === 'LOBBY' && newConfig.initialPurseCr) {
      for (const fId of Object.keys(this.franchises) as FranchiseId[]) {
        this.franchises[fId].purseRemainingCr = newConfig.initialPurseCr;
      }
    }
    this.broadcastUpdate();
  }

  // ==========================================
  // AUCTION PHASE
  // ==========================================
  public startAuction() {
    this.status = 'AUCTION';

    this.auctionEngine = new AuctionEngine(
      this.config,
      () => this.franchises,
      (fId, player, price) => {
        const squad = this.franchises[fId];
        squad.players.push(player);
        squad.purseRemainingCr = parseFloat((squad.purseRemainingCr - price).toFixed(2));
        squad.purseSpentCr = parseFloat((squad.purseSpentCr + price).toFixed(2));
      },
      () => this.broadcastUpdate(),
      (sold) => {
        this.addSystemMessage(
          `🔨 SOLD! ${sold.player.name} sold to ${IPL_FRANCHISES[sold.winningFranchiseId].name} for ₹${sold.priceCr.toFixed(2)} Cr!`
        );
        this.broadcastUpdate();
      },
      (unsold) => {
        this.addSystemMessage(`❌ UNSOLD: ${unsold.name} went unsold at ₹${unsold.basePriceCr.toFixed(2)} Cr.`);
        this.broadcastUpdate();
      },
      () => {
        this.addSystemMessage(`🎉 MEGA AUCTION COMPLETE! Proceeding to Squad Management.`);
        this.status = 'SQUADS';
        this.autoFillAISquadsIfShort();
        this.broadcastUpdate();
      }
    );

    this.auctionEngine.start();
    this.addSystemMessage(`The IPL Mega Auction has officially begun!`);
    this.broadcastUpdate();
  }

  private autoFillAISquadsIfShort() {
    // If any team has fewer than 15 players, fill remaining spots with available undrafted players
    const draftedIds = new Set<string>();
    for (const squad of Object.values(this.franchises)) {
      for (const p of squad.players) draftedIds.add(p.id);
    }
    const available = REAL_IPL_PLAYERS.filter((p) => !draftedIds.has(p.id));

    for (const squad of Object.values(this.franchises)) {
      while (squad.players.length < this.config.minSquadSize && available.length > 0) {
        const filler = available.shift()!;
        squad.players.push(filler);
      }
    }
  }

  public placeBid(socketId: string, customAmount?: number): { success: boolean; message: string } {
    if (!this.auctionEngine || this.status !== 'AUCTION') {
      return { success: false, message: 'Auction is not active' };
    }

    const mgr = this.managers.find((m) => m.socketId === socketId);
    if (!mgr || !mgr.franchiseId) {
      return { success: false, message: 'You must select a franchise to place bids!' };
    }

    return this.auctionEngine.placeBid(mgr.franchiseId, mgr.name, customAmount);
  }

  public pauseAuction() {
    if (this.auctionEngine) {
      this.auctionEngine.pause();
      this.addSystemMessage(`Auction paused by host.`);
    }
  }

  public resumeAuction() {
    if (this.auctionEngine) {
      this.auctionEngine.resume();
      this.addSystemMessage(`Auction resumed.`);
    }
  }

  public fastForwardAuction() {
    if (this.auctionEngine) {
      this.auctionEngine.fastForwardHammer();
    }
  }

  // ==========================================
  // SQUAD MANAGEMENT
  // ==========================================
  public updatePlayingXI(
    franchiseId: FranchiseId,
    playingXI: string[],
    captainId?: string,
    wicketkeeperId?: string,
    impactPlayerId?: string
  ): { success: boolean; message: string } {
    const squad = this.franchises[franchiseId];
    if (!squad) return { success: false, message: 'Invalid franchise' };

    // Validate 11 players
    if (playingXI.length !== 11) {
      return { success: false, message: 'Playing XI must have exactly 11 players!' };
    }

    const selectedPlayers = squad.players.filter((p) => playingXI.includes(p.id));

    // Validate max 4 overseas
    const overseasCount = selectedPlayers.filter((p) => p.isOverseas).length;
    if (overseasCount > this.config.maxOverseasInXI) {
      return {
        success: false,
        message: `Maximum ${this.config.maxOverseasInXI} overseas players allowed in Playing XI (Selected: ${overseasCount})`,
      };
    }

    // Validate at least 1 wicketkeeper
    const keeper = selectedPlayers.find((p) => p.role === 'WK' || p.id === wicketkeeperId);
    if (!keeper) {
      return { success: false, message: 'Playing XI must include at least one designated Wicketkeeper!' };
    }

    // Validate bowling options (at least 5 players with bowling rating >= 50 or role BOWL/AR)
    const bowlingOptions = selectedPlayers.filter(
      (p) => p.role === 'BOWL' || p.role === 'AR' || p.bowlingRating >= 60
    ).length;
    if (bowlingOptions < 5) {
      return { success: false, message: 'Playing XI must have at least 5 bowling options!' };
    }

    squad.playingXI = playingXI;
    squad.captainId = captainId || playingXI[0];
    squad.wicketkeeperId = wicketkeeperId || keeper.id;
    squad.impactPlayerId = impactPlayerId;
    squad.isReady = true;

    this.broadcastUpdate();
    return { success: true, message: 'Playing XI confirmed!' };
  }

  public proceedToTournament() {
    this.status = 'TOURNAMENT';
    this.addSystemMessage(`Tournament stage begins! Fixtures and table generated.`);
    this.broadcastUpdate();
  }

  // ==========================================
  // MATCH SIMULATION
  // ==========================================
  public startMatch(matchId: string): { success: boolean; message: string } {
    const tournamentState = this.tournamentEngine.getState();
    const match = tournamentState.matches.find((m) => m.id === matchId);
    if (!match) return { success: false, message: 'Match not found' };

    this.activeMatchId = matchId;
    this.status = 'MATCH';

    const homeSquad = this.franchises[match.homeTeam];
    const awaySquad = this.franchises[match.awayTeam];

    this.activeSimulation = new SimulationEngine(match, homeSquad, awaySquad);
    const updatedMatch = this.activeSimulation.getMatchData();

    this.addSystemMessage(
      `🏟️ Match #${match.matchNumber}: ${IPL_FRANCHISES[match.homeTeam].name} vs ${IPL_FRANCHISES[match.awayTeam].name} at ${match.venue}. Toss won by ${updatedMatch.tossWinner} who chose to ${updatedMatch.tossDecision}.`
    );

    this.broadcastUpdate();
    return { success: true, message: 'Match started!' };
  }

  public stepMatchBall(): { success: boolean; event: any } {
    if (!this.activeSimulation) return { success: false, event: null };

    const event = this.activeSimulation.simulateBall();
    const match = this.activeSimulation.getMatchData();

    if (match.status === 'COMPLETED') {
      this.tournamentEngine.onMatchCompleted(match);
      this.addSystemMessage(
        `🏆 ${IPL_FRANCHISES[match.winner!].name} won ${match.winMargin}! Player of the Match: ${match.playerOfTheMatch?.name}`
      );
      if (match.stage === 'FINAL') {
        this.status = 'TROPHY';
      }
    }

    this.broadcastUpdate();
    return { success: true, event };
  }

  public stepMatchOver(): { success: boolean; events: any[] } {
    if (!this.activeSimulation) return { success: false, events: [] };

    const events = this.activeSimulation.simulateOver();
    const match = this.activeSimulation.getMatchData();

    if (match.status === 'COMPLETED') {
      this.tournamentEngine.onMatchCompleted(match);
      this.addSystemMessage(
        `🏆 ${IPL_FRANCHISES[match.winner!].name} won ${match.winMargin}! Player of the Match: ${match.playerOfTheMatch?.name}`
      );
      if (match.stage === 'FINAL') {
        this.status = 'TROPHY';
      }
    }

    this.broadcastUpdate();
    return { success: true, events };
  }

  public simMatchInnings(): { success: boolean } {
    if (!this.activeSimulation) return { success: false };

    this.activeSimulation.simulateInnings();
    const match = this.activeSimulation.getMatchData();

    if (match.status === 'COMPLETED') {
      this.tournamentEngine.onMatchCompleted(match);
      this.addSystemMessage(
        `🏆 ${IPL_FRANCHISES[match.winner!].name} won ${match.winMargin}! Player of the Match: ${match.playerOfTheMatch?.name}`
      );
      if (match.stage === 'FINAL') {
        this.status = 'TROPHY';
      }
    }

    this.broadcastUpdate();
    return { success: true };
  }

  public simFullActiveMatch(): { success: boolean; match: MatchData } {
    if (!this.activeSimulation) {
      return { success: false, match: null as any };
    }

    const match = this.activeSimulation.simulateFullMatch();
    this.tournamentEngine.onMatchCompleted(match);

    this.addSystemMessage(
      `🏆 ${IPL_FRANCHISES[match.winner!].name} won ${match.winMargin}! Player of the Match: ${match.playerOfTheMatch?.name}`
    );

    if (match.stage === 'FINAL') {
      this.status = 'TROPHY';
    }

    this.broadcastUpdate();
    return { success: true, match };
  }

  public setMatchTactics(franchiseId: FranchiseId, aggression: TacticalAggression) {
    if (this.activeSimulation) {
      this.activeSimulation.setAggression(franchiseId, aggression);
      this.broadcastUpdate();
    }
  }

  public returnToTournament() {
    this.status = 'TOURNAMENT';
    this.activeMatchId = undefined;
    this.broadcastUpdate();
  }
}

export class RoomManager {
  private rooms: Map<string, RoomInstance> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public createRoom(name: string, hostSocketId: string, hostName: string): RoomInstance {
    // Generate clean 6-character room code like "IPL-782"
    const code = `IPL-${Math.floor(1000 + Math.random() * 9000)}`;
    const room = new RoomInstance(code, name, hostSocketId, hostName, this.io);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(roomId: string): RoomInstance | undefined {
    return this.rooms.get(roomId);
  }

  public listPublicRooms(): Array<{ id: string; name: string; hostName: string; playersCount: number; status: string }> {
    const list: Array<{ id: string; name: string; hostName: string; playersCount: number; status: string }> = [];
    for (const r of this.rooms.values()) {
      list.push({
        id: r.id,
        name: r.name,
        hostName: r.hostName,
        playersCount: r.managers.length,
        status: r.status,
      });
    }
    return list;
  }

  public handleDisconnect(socketId: string) {
    for (const r of this.rooms.values()) {
      r.leaveManager(socketId);
    }
  }
}

import {
  AuctionBid,
  AuctionState,
  FranchiseId,
  Player,
  PlayerRole,
  RoomConfig,
  SoldRecord,
  TeamSquad,
} from '../src/types/cricket';
import { REAL_IPL_PLAYERS } from '../src/data/players';

export class AuctionEngine {
  private playersQueue: Player[] = [];
  private state: AuctionState;
  private config: RoomConfig;
  private timerInterval: NodeJS.Timeout | null = null;
  private onStateChange: (state: AuctionState) => void;
  private onPlayerSold: (sold: SoldRecord) => void;
  private onPlayerUnsold: (player: Player) => void;
  private onAuctionComplete: () => void;
  private getSquads: () => Record<FranchiseId, TeamSquad>;
  private updateSquad: (franchiseId: FranchiseId, player: Player, priceCr: number) => void;
  private aiBidTimeout: NodeJS.Timeout | null = null;

  constructor(
    config: RoomConfig,
    getSquads: () => Record<FranchiseId, TeamSquad>,
    updateSquad: (franchiseId: FranchiseId, player: Player, priceCr: number) => void,
    onStateChange: (state: AuctionState) => void,
    onPlayerSold: (sold: SoldRecord) => void,
    onPlayerUnsold: (player: Player) => void,
    onAuctionComplete: () => void
  ) {
    this.config = config;
    this.getSquads = getSquads;
    this.updateSquad = updateSquad;
    this.onStateChange = onStateChange;
    this.onPlayerSold = onPlayerSold;
    this.onPlayerUnsold = onPlayerUnsold;
    this.onAuctionComplete = onAuctionComplete;

    this.preparePlayerQueue();

    this.state = {
      status: 'PENDING',
      currentCategory: 'MARQUEE',
      currentPlayerIndex: -1,
      currentPlayer: null,
      currentBidCr: 0,
      highestBidder: null,
      highestBidderName: null,
      timerSeconds: config.bidTimerSeconds,
      bidHistory: [],
      soldHistory: [],
      unsoldPlayerIds: [],
      totalPlayersAuctioned: 0,
    };
  }

  private preparePlayerQueue() {
    // Organize by Marquee first, then Batters, Keepers, All-rounders, Bowlers
    const marquee = REAL_IPL_PLAYERS.filter((p) => p.tier === 'Marquee');
    const batters = REAL_IPL_PLAYERS.filter(
      (p) => p.role === 'BAT' && p.tier !== 'Marquee'
    );
    const keepers = REAL_IPL_PLAYERS.filter(
      (p) => p.role === 'WK' && p.tier !== 'Marquee'
    );
    const allrounders = REAL_IPL_PLAYERS.filter(
      (p) => p.role === 'AR' && p.tier !== 'Marquee'
    );
    const bowlers = REAL_IPL_PLAYERS.filter(
      (p) => p.role === 'BOWL' && p.tier !== 'Marquee'
    );

    // Shuffle within sets for excitement while keeping structured sets
    const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    this.playersQueue = [
      ...shuffle(marquee),
      ...shuffle(batters),
      ...shuffle(keepers),
      ...shuffle(allrounders),
      ...shuffle(bowlers),
    ];
  }

  public getState(): AuctionState {
    return { ...this.state };
  }

  public start() {
    if (this.state.status === 'ACTIVE') return;
    this.state.status = 'ACTIVE';
    this.nextPlayer();
  }

  public pause() {
    if (this.state.status !== 'ACTIVE') return;
    this.state.status = 'PAUSED';
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.aiBidTimeout) clearTimeout(this.aiBidTimeout);
    this.onStateChange(this.getState());
  }

  public resume() {
    if (this.state.status !== 'PAUSED') return;
    this.state.status = 'ACTIVE';
    this.startTimer();
    this.scheduleAIBidIfNeeded();
    this.onStateChange(this.getState());
  }

  public calculateNextBidIncrement(currentBidCr: number): number {
    if (currentBidCr < 2.0) return 0.2;
    if (currentBidCr < 5.0) return 0.25;
    if (currentBidCr < 10.0) return 0.5;
    return 1.0;
  }

  public placeBid(
    franchiseId: FranchiseId,
    managerName: string,
    offeredAmountCr?: number
  ): { success: boolean; message: string } {
    if (this.state.status !== 'ACTIVE' || !this.state.currentPlayer) {
      return { success: false, message: 'Auction is not active or no player is on the block.' };
    }

    if (this.state.highestBidder === franchiseId) {
      return { success: false, message: 'You already hold the highest bid!' };
    }

    const player = this.state.currentPlayer;
    const squads = this.getSquads();
    const squad = squads[franchiseId];

    if (!squad) {
      return { success: false, message: 'Invalid franchise.' };
    }

    // Check overseas limits
    if (player.isOverseas) {
      const overseasCount = squad.players.filter((p) => p.isOverseas).length;
      if (overseasCount >= this.config.maxOverseasInSquad) {
        return {
          success: false,
          message: `Overseas quota full! (Maximum ${this.config.maxOverseasInSquad})`,
        };
      }
    }

    // Check max squad size
    if (squad.players.length >= this.config.maxSquadSize) {
      return {
        success: false,
        message: `Squad is already full! (Maximum ${this.config.maxSquadSize} players)`,
      };
    }

    const nextIncrement = this.calculateNextBidIncrement(this.state.currentBidCr);
    const minBid =
      this.state.highestBidder === null
        ? player.basePriceCr
        : parseFloat((this.state.currentBidCr + nextIncrement).toFixed(2));

    const finalBid = offeredAmountCr && offeredAmountCr >= minBid ? offeredAmountCr : minBid;

    // Purse validation: must reserve at least 0.20 Cr for each unfilled required squad spot
    const remainingSpotsNeeded = Math.max(0, this.config.minSquadSize - (squad.players.length + 1));
    const reservedPurse = remainingSpotsNeeded * 0.2;

    if (squad.purseRemainingCr - finalBid < reservedPurse) {
      return {
        success: false,
        message: `Insufficient purse! Need ₹${reservedPurse.toFixed(2)} Cr reserved for remaining squad spots.`,
      };
    }

    // Accept bid
    this.state.currentBidCr = finalBid;
    this.state.highestBidder = franchiseId;
    this.state.highestBidderName = managerName;

    const bidRecord: AuctionBid = {
      franchiseId,
      managerName,
      amountCr: finalBid,
      timestamp: Date.now(),
    };
    this.state.bidHistory.push(bidRecord);

    // Reset timer to at least 6s if under 5s to allow counter-bids
    if (this.state.timerSeconds < 6) {
      this.state.timerSeconds = 6;
    }

    this.onStateChange(this.getState());

    // Allow AI to consider responding to this bid
    this.scheduleAIBidIfNeeded();

    return { success: true, message: 'Bid accepted!' };
  }

  private nextPlayer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.aiBidTimeout) clearTimeout(this.aiBidTimeout);

    this.state.currentPlayerIndex++;
    if (this.state.currentPlayerIndex >= this.playersQueue.length) {
      // Check if we need an accelerated round of unsold players
      if (this.state.unsoldPlayerIds.length > 0 && this.state.status !== 'ACCELERATED') {
        this.state.status = 'ACCELERATED';
        const unsoldPlayers = REAL_IPL_PLAYERS.filter((p) =>
          this.state.unsoldPlayerIds.includes(p.id)
        );
        this.playersQueue = unsoldPlayers;
        this.state.unsoldPlayerIds = [];
        this.state.currentPlayerIndex = 0;
      } else {
        this.finishAuction();
        return;
      }
    }

    const player = this.playersQueue[this.state.currentPlayerIndex];
    this.state.currentPlayer = player;
    this.state.currentCategory = player.tier === 'Marquee' ? 'MARQUEE' : player.role;
    this.state.currentBidCr = player.basePriceCr;
    this.state.highestBidder = null;
    this.state.highestBidderName = null;
    this.state.timerSeconds = this.config.bidTimerSeconds;
    this.state.bidHistory = [];
    this.state.totalPlayersAuctioned++;

    this.onStateChange(this.getState());
    this.startTimer();

    // Trigger AI bid evaluation
    this.scheduleAIBidIfNeeded();
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.state.status !== 'ACTIVE') return;

      this.state.timerSeconds--;
      if (this.state.timerSeconds <= 0) {
        this.concludeCurrentPlayer();
      } else {
        this.onStateChange(this.getState());
      }
    }, 1000);
  }

  private concludeCurrentPlayer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.aiBidTimeout) clearTimeout(this.aiBidTimeout);

    const player = this.state.currentPlayer;
    if (!player) return;

    if (this.state.highestBidder) {
      // SOLD
      const soldRecord: SoldRecord = {
        player: { ...player, soldPriceCr: this.state.currentBidCr, soldTo: this.state.highestBidder },
        winningFranchiseId: this.state.highestBidder,
        priceCr: this.state.currentBidCr,
        timestamp: Date.now(),
      };
      this.state.soldHistory.push(soldRecord);
      this.updateSquad(this.state.highestBidder, player, this.state.currentBidCr);
      this.onPlayerSold(soldRecord);
    } else {
      // UNSOLD
      this.state.unsoldPlayerIds.push(player.id);
      this.onPlayerUnsold(player);
    }

    this.state.currentPlayer = null;
    this.onStateChange(this.getState());

    // 2.5s pause before presenting next player
    setTimeout(() => {
      if (this.state.status === 'ACTIVE' || this.state.status === 'ACCELERATED') {
        this.nextPlayer();
      }
    }, 2500);
  }

  public fastForwardHammer() {
    if (this.state.status === 'ACTIVE' && this.state.currentPlayer) {
      this.state.timerSeconds = 1;
      this.onStateChange(this.getState());
    }
  }

  private finishAuction() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.aiBidTimeout) clearTimeout(this.aiBidTimeout);

    this.state.status = 'COMPLETED';
    this.state.currentPlayer = null;
    this.onStateChange(this.getState());
    this.onAuctionComplete();
  }

  // ==========================================
  // INTELLIGENT AI BIDDING ENGINE
  // ==========================================
  private scheduleAIBidIfNeeded() {
    if (this.aiBidTimeout) clearTimeout(this.aiBidTimeout);
    if (this.state.status !== 'ACTIVE' || !this.state.currentPlayer) return;

    // Delay AI bids naturally between 1.2s and 2.5s
    const delay = 1200 + Math.random() * 1300;

    this.aiBidTimeout = setTimeout(() => {
      this.evaluateAIBids();
    }, delay);
  }

  private evaluateAIBids() {
    if (this.state.status !== 'ACTIVE' || !this.state.currentPlayer) return;

    const player = this.state.currentPlayer;
    const squads = this.getSquads();
    const currentBid = this.state.currentBidCr;
    const nextInc = this.calculateNextBidIncrement(currentBid);
    const targetBid =
      this.state.highestBidder === null ? player.basePriceCr : parseFloat((currentBid + nextInc).toFixed(2));

    // Get list of AI teams
    const aiFranchises = (Object.keys(squads) as FranchiseId[]).filter(
      (fId) => squads[fId].isAI && squads[fId].franchiseId !== this.state.highestBidder
    );

    if (aiFranchises.length === 0) return;

    // Evaluate each AI franchise's interest in this player
    const interestedCandidates: Array<{ franchiseId: FranchiseId; maxValuation: number }> = [];

    for (const fId of aiFranchises) {
      const squad = squads[fId];

      // Check overseas limit
      if (player.isOverseas) {
        const overseasCount = squad.players.filter((p) => p.isOverseas).length;
        if (overseasCount >= this.config.maxOverseasInSquad) continue;
      }

      // Check max squad size
      if (squad.players.length >= this.config.maxSquadSize) continue;

      // Check purse reservation
      const remainingSpots = Math.max(0, this.config.minSquadSize - (squad.players.length + 1));
      const reservedPurse = remainingSpots * 0.2;
      if (squad.purseRemainingCr - targetBid < reservedPurse) continue;

      // AI Valuation Model:
      // Base value derived from player rating & tier
      let valuation = player.basePriceCr;
      if (player.tier === 'Marquee') {
        valuation = Math.max(valuation, 10.0 + (player.overallRating - 90) * 2.0);
      } else if (player.tier === 'Tier 1') {
        valuation = Math.max(valuation, 4.0 + (player.overallRating - 85) * 1.0);
      } else {
        valuation = Math.max(valuation, 1.5 + (player.overallRating - 80) * 0.5);
      }

      // Role necessity multiplier
      const roleCounts = {
        BAT: squad.players.filter((p) => p.role === 'BAT').length,
        WK: squad.players.filter((p) => p.role === 'WK').length,
        AR: squad.players.filter((p) => p.role === 'AR').length,
        BOWL: squad.players.filter((p) => p.role === 'BOWL').length,
      };

      // Desperation if lacking keeper
      if (player.role === 'WK' && roleCounts.WK === 0) {
        valuation *= 1.35;
      }
      // Need batting anchor or explosive finisher
      if (player.role === 'BAT' && roleCounts.BAT < 3) {
        valuation *= 1.25;
      }
      // Need bowling spearhead
      if (player.role === 'BOWL' && roleCounts.BOWL < 3) {
        valuation *= 1.25;
      }
      // All-rounder versatility
      if (player.role === 'AR' && roleCounts.AR < 2) {
        valuation *= 1.2;
      }

      // Purse factor: Don't spend more than 22% of total starting purse on any single player unless Marquee
      const maxSinglePlayerSpend =
        player.tier === 'Marquee'
          ? this.config.initialPurseCr * 0.24
          : this.config.initialPurseCr * 0.15;
      valuation = Math.min(valuation, maxSinglePlayerSpend, squad.purseRemainingCr - reservedPurse);

      // Random personality jitter (±10%)
      valuation *= 0.9 + Math.random() * 0.2;

      if (valuation >= targetBid) {
        interestedCandidates.push({ franchiseId: fId, maxValuation: valuation });
      }
    }

    if (interestedCandidates.length > 0) {
      // Pick the franchise with highest relative valuation or random among top
      interestedCandidates.sort((a, b) => b.maxValuation - a.maxValuation);
      const chosen = interestedCandidates[0];
      const squad = squads[chosen.franchiseId];
      this.placeBid(chosen.franchiseId, squad.managerName || `${chosen.franchiseId} AI`, targetBid);
    }
  }

  public destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.aiBidTimeout) clearTimeout(this.aiBidTimeout);
  }
}

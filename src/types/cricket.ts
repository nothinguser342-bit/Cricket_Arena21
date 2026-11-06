export type FranchiseId =
  | 'CSK'
  | 'MI'
  | 'RCB'
  | 'KKR'
  | 'SRH'
  | 'RR'
  | 'DC'
  | 'PBKS'
  | 'GT'
  | 'LSG';

export type PlayerRole = 'BAT' | 'WK' | 'AR' | 'BOWL';

export type BattingStyle = 'Right Hand Bat' | 'Left Hand Bat';

export type BowlingStyle =
  | 'Right Arm Fast'
  | 'Right Arm Medium'
  | 'Right Arm Off Break'
  | 'Right Arm Leg Break'
  | 'Left Arm Fast'
  | 'Left Arm Orthodox'
  | 'Left Arm Wrist Spin'
  | 'None';

export type PlayerTier = 'Marquee' | 'Tier 1' | 'Tier 2' | 'Emerging';

export interface PlayerStats {
  matches: number;
  runs: number;
  battingAvg: number;
  strikeRate: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  bowlingAvg: number;
  economy: number;
  bestBowling: string;
}

export interface Player {
  id: string;
  name: string;
  shortName: string;
  country: string;
  isOverseas: boolean;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  basePriceCr: number; // in Crores, e.g. 2.0
  overallRating: number; // 75 - 96
  battingRating: number; // 50 - 98
  bowlingRating: number; // 20 - 98
  fieldingRating: number; // 60 - 95
  stats: PlayerStats;
  tier: PlayerTier;
  avatarSeed?: string;
  soldPriceCr?: number;
  soldTo?: FranchiseId;
}

export interface Franchise {
  id: FranchiseId;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  homeVenue: string;
  city: string;
  titles: number;
  logoSymbol: string;
  coachName: string;
  aiBotName: string;
  motto: string;
}

export interface TeamSquad {
  franchiseId: FranchiseId;
  purseRemainingCr: number;
  purseSpentCr: number;
  players: Player[];
  playingXI: string[]; // Player IDs
  impactPlayerId?: string;
  captainId?: string;
  wicketkeeperId?: string;
  bowlerOrder: string[]; // Player IDs in preferred bowling rotation
  managerName: string;
  isAI: boolean;
  isReady: boolean;
}

export interface RoomConfig {
  initialPurseCr: number;
  bidTimerSeconds: number;
  minSquadSize: number;
  maxSquadSize: number;
  maxOverseasInSquad: number;
  maxOverseasInXI: number;
  leagueLength: 'CONDENSED' | 'FULL'; // 9 matches each or 18 matches each
}

export interface ManagerInfo {
  socketId: string;
  userId: string;
  name: string;
  franchiseId?: FranchiseId;
  isReady: boolean;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  type?: 'system' | 'bid' | 'chat';
}

export interface AuctionBid {
  franchiseId: FranchiseId;
  managerName: string;
  amountCr: number;
  timestamp: number;
}

export interface SoldRecord {
  player: Player;
  winningFranchiseId: FranchiseId;
  priceCr: number;
  timestamp: number;
}

export interface AuctionState {
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ACCELERATED' | 'COMPLETED';
  currentCategory: PlayerRole | 'MARQUEE';
  currentPlayerIndex: number;
  currentPlayer: Player | null;
  currentBidCr: number;
  highestBidder: FranchiseId | null;
  highestBidderName: string | null;
  timerSeconds: number;
  bidHistory: AuctionBid[];
  soldHistory: SoldRecord[];
  unsoldPlayerIds: string[];
  totalPlayersAuctioned: number;
}

export type BallResult = '0' | '1' | '2' | '3' | '4' | '6' | 'W' | 'Wd' | 'Nb' | 'B' | 'Lb';

export interface BallEvent {
  id: string;
  overIndex: number; // 0 to 19
  ballInOver: number; // 1 to 6
  bowlerId: string;
  bowlerName: string;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runsScored: number;
  extras: number;
  isWicket: boolean;
  wicketType?: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED';
  dismissedPlayerName?: string;
  isFour: boolean;
  isSix: boolean;
  commentary: string;
  totalTeamRuns: number;
  totalTeamWickets: number;
}

export interface BatsmanInningsStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerInningsStats {
  playerId: string;
  name: string;
  overs: number;
  ballsThisOver: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
}

export interface InningsData {
  battingFranchiseId: FranchiseId;
  bowlingFranchiseId: FranchiseId;
  totalRuns: number;
  totalWickets: number;
  completedOvers: number;
  ballsInCurrentOver: number;
  isCompleted: boolean;
  target?: number;
  batsmen: Record<string, BatsmanInningsStats>;
  bowlers: Record<string, BowlerInningsStats>;
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  ballEvents: BallEvent[];
  recentOversSummary: string[];
  worm: number[]; // cumulative runs after each completed over
}

export type MatchStage =
  | 'LEAGUE'
  | 'QUALIFIER_1'
  | 'ELIMINATOR'
  | 'QUALIFIER_2'
  | 'FINAL';

export interface MatchData {
  id: string;
  matchNumber: number;
  stage: MatchStage;
  homeTeam: FranchiseId;
  awayTeam: FranchiseId;
  venue: string;
  pitchType: 'BATTING' | 'BOWLING' | 'SPIN' | 'BALANCED';
  status: 'SCHEDULED' | 'TOSS' | 'INNINGS_1' | 'INNINGS_BREAK' | 'INNINGS_2' | 'COMPLETED';
  tossWinner?: FranchiseId;
  tossDecision?: 'BAT' | 'BOWL';
  currentInnings: 1 | 2;
  innings1?: InningsData;
  innings2?: InningsData;
  winner?: FranchiseId;
  winMargin?: string;
  playerOfTheMatch?: {
    id: string;
    name: string;
    team: FranchiseId;
    performance: string;
  };
}

export interface PointsTableEntry {
  franchiseId: FranchiseId;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
  netRunRate: number;
  form: Array<'W' | 'L' | 'D'>;
}

export interface TournamentLeader {
  playerId: string;
  playerName: string;
  franchiseId: FranchiseId;
  value: number;
  subText: string;
}

export interface TournamentState {
  currentRound: number;
  totalLeagueRounds: number;
  currentMatchIndex: number;
  matches: MatchData[];
  pointsTable: PointsTableEntry[];
  orangeCapLeader?: TournamentLeader;
  purpleCapLeader?: TournamentLeader;
  champion?: FranchiseId;
  runnerUp?: FranchiseId;
}

export interface RoomState {
  id: string;
  name: string;
  hostSocketId: string;
  hostName: string;
  status: 'LOBBY' | 'AUCTION' | 'SQUADS' | 'TOURNAMENT' | 'MATCH' | 'TROPHY';
  config: RoomConfig;
  franchises: Record<FranchiseId, TeamSquad>;
  managers: ManagerInfo[];
  chatMessages: ChatMessage[];
  auction: AuctionState;
  tournament: TournamentState;
  activeMatchId?: string;
}

export type TacticalAggression = 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE' | 'MAXIMUM_ATTACK';
export type BowlingTactic = 'NORMAL' | 'ATTACK_STUMPS' | 'YORKERS_DEATH' | 'CONTAINMENT';

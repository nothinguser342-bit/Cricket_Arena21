import {
  BallEvent,
  BowlingTactic,
  FranchiseId,
  InningsData,
  MatchData,
  Player,
  TacticalAggression,
  TeamSquad,
} from '../src/types/cricket';
import { IPL_FRANCHISES } from '../src/data/teams';
import { PLAYER_MAP } from '../src/data/players';

export class SimulationEngine {
  private match: MatchData;
  private homeSquad: TeamSquad;
  private awaySquad: TeamSquad;
  private homeXI: Player[] = [];
  private awayXI: Player[] = [];
  private currentAggression: Record<FranchiseId, TacticalAggression> = {
    CSK: 'BALANCED',
    MI: 'BALANCED',
    RCB: 'BALANCED',
    KKR: 'BALANCED',
    SRH: 'BALANCED',
    RR: 'BALANCED',
    DC: 'BALANCED',
    PBKS: 'BALANCED',
    GT: 'BALANCED',
    LSG: 'BALANCED',
  };
  private currentBowlingTactic: Record<FranchiseId, BowlingTactic> = {
    CSK: 'NORMAL',
    MI: 'NORMAL',
    RCB: 'NORMAL',
    KKR: 'NORMAL',
    SRH: 'NORMAL',
    RR: 'NORMAL',
    DC: 'NORMAL',
    PBKS: 'NORMAL',
    GT: 'NORMAL',
    LSG: 'NORMAL',
  };

  constructor(match: MatchData, homeSquad: TeamSquad, awaySquad: TeamSquad) {
    this.match = { ...match };
    this.homeSquad = homeSquad;
    this.awaySquad = awaySquad;

    this.homeXI = this.resolvePlayingXI(homeSquad);
    this.awayXI = this.resolvePlayingXI(awaySquad);

    if (this.match.status === 'SCHEDULED') {
      this.conductToss();
    }
  }

  public getMatchData(): MatchData {
    return this.match;
  }

  public setAggression(franchiseId: FranchiseId, aggression: TacticalAggression) {
    this.currentAggression[franchiseId] = aggression;
  }

  public setBowlingTactic(franchiseId: FranchiseId, tactic: BowlingTactic) {
    this.currentBowlingTactic[franchiseId] = tactic;
  }

  // Auto-select or validate playing XI: 1 WK, <= 4 overseas, >= 5 bowlers
  private resolvePlayingXI(squad: TeamSquad): Player[] {
    const players = squad.players;
    if (players.length === 0) return [];

    let chosenIds = [...(squad.playingXI || [])];

    // If valid 11 provided, use it
    if (chosenIds.length === 11) {
      const selected = chosenIds.map((id) => PLAYER_MAP[id] || players.find((p) => p.id === id)).filter(Boolean) as Player[];
      if (selected.length === 11) return selected;
    }

    // Otherwise intelligently auto-pick optimal XI:
    const sorted = [...players].sort((a, b) => b.overallRating - a.overallRating);

    // 1. Mandatory Wicketkeeper
    const keepers = sorted.filter((p) => p.role === 'WK');
    const bestKeeper = keepers[0] || sorted[0];

    // 2. Select remaining with max 4 overseas limit
    const xi: Player[] = [bestKeeper];
    let overseasCount = bestKeeper.isOverseas ? 1 : 0;

    // Add remaining top players respecting constraints
    for (const player of sorted) {
      if (xi.length >= 11) break;
      if (player.id === bestKeeper.id) continue;

      if (player.isOverseas && overseasCount >= 4) continue;

      xi.push(player);
      if (player.isOverseas) overseasCount++;
    }

    // Fill to 11 if somehow short
    for (const player of sorted) {
      if (xi.length >= 11) break;
      if (!xi.some((p) => p.id === player.id)) {
        xi.push(player);
      }
    }

    return xi;
  }

  private conductToss() {
    const homeTeam = this.match.homeTeam;
    const awayTeam = this.match.awayTeam;

    const coinFlip = Math.random() < 0.5;
    const tossWinner = coinFlip ? homeTeam : awayTeam;
    this.match.tossWinner = tossWinner;

    // Pitch & conditions influence toss decision
    let decision: 'BAT' | 'BOWL' = 'BOWL'; // T20 modern meta prefers chasing
    if (this.match.pitchType === 'SPIN' || Math.random() < 0.3) {
      decision = 'BAT';
    }

    this.match.tossDecision = decision;

    const battingFirst =
      decision === 'BAT' ? tossWinner : tossWinner === homeTeam ? awayTeam : homeTeam;
    const bowlingFirst = battingFirst === homeTeam ? awayTeam : homeTeam;

    this.match.currentInnings = 1;
    this.match.status = 'INNINGS_1';

    this.match.innings1 = this.createEmptyInnings(battingFirst, bowlingFirst);
  }

  private createEmptyInnings(
    battingTeam: FranchiseId,
    bowlingTeam: FranchiseId,
    target?: number
  ): InningsData {
    const battingXI = battingTeam === this.match.homeTeam ? this.homeXI : this.awayXI;
    const bowlingXI = bowlingTeam === this.match.homeTeam ? this.homeXI : this.awayXI;

    const opener1 = battingXI[0] || { id: 'p_open1', name: 'Opener 1' };
    const opener2 = battingXI[1] || { id: 'p_open2', name: 'Opener 2' };

    // Select opening bowler (fast bowler preferred)
    const bowlers = bowlingXI.filter((p) => p.role === 'BOWL' || p.role === 'AR');
    const openingBowler = bowlers[0] || bowlingXI[bowlingXI.length - 1];

    const batsmenStats: InningsData['batsmen'] = {};
    for (const p of battingXI) {
      batsmenStats[p.id] = {
        playerId: p.id,
        name: p.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
      };
    }

    const bowlerStats: InningsData['bowlers'] = {};
    for (const p of bowlingXI) {
      bowlerStats[p.id] = {
        playerId: p.id,
        name: p.name,
        overs: 0,
        ballsThisOver: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
      };
    }

    return {
      battingFranchiseId: battingTeam,
      bowlingFranchiseId: bowlingTeam,
      totalRuns: 0,
      totalWickets: 0,
      completedOvers: 0,
      ballsInCurrentOver: 0,
      isCompleted: false,
      target,
      batsmen: batsmenStats,
      bowlers: bowlerStats,
      currentStrikerId: opener1.id,
      currentNonStrikerId: opener2.id,
      currentBowlerId: openingBowler.id,
      ballEvents: [],
      recentOversSummary: [],
      worm: [0],
    };
  }

  public simulateBall(): BallEvent | null {
    if (this.match.status === 'COMPLETED') return null;

    if (this.match.status === 'INNINGS_1' && this.match.innings1) {
      const event = this.stepBallInnings(this.match.innings1);
      if (this.match.innings1.isCompleted) {
        this.transitionToInnings2();
      }
      return event;
    }

    if (this.match.status === 'INNINGS_2' && this.match.innings2) {
      const event = this.stepBallInnings(this.match.innings2);
      if (this.match.innings2.isCompleted) {
        this.finishMatch();
      }
      return event;
    }

    return null;
  }

  public simulateOver(): BallEvent[] {
    const events: BallEvent[] = [];
    for (let i = 0; i < 6; i++) {
      const ev = this.simulateBall();
      if (!ev) break;
      events.push(ev);
      // If over ended or innings completed, stop
      if (ev.ballInOver === 6 || this.match.status === 'COMPLETED' || this.match.status === 'INNINGS_BREAK') {
        break;
      }
    }
    return events;
  }

  public simulateInnings(): void {
    while (this.match.status === 'INNINGS_1' || this.match.status === 'INNINGS_2') {
      this.simulateBall();
    }
  }

  public simulateFullMatch(): MatchData {
    while (this.match.status !== 'COMPLETED') {
      this.simulateBall();
    }
    return this.match;
  }

  private stepBallInnings(innings: InningsData): BallEvent {
    const battingXI =
      innings.battingFranchiseId === this.match.homeTeam ? this.homeXI : this.awayXI;
    const bowlingXI =
      innings.bowlingFranchiseId === this.match.homeTeam ? this.homeXI : this.awayXI;

    const striker = battingXI.find((p) => p.id === innings.currentStrikerId) || battingXI[0];
    const nonStriker =
      battingXI.find((p) => p.id === innings.currentNonStrikerId) || battingXI[1];
    const bowler = bowlingXI.find((p) => p.id === innings.currentBowlerId) || bowlingXI[bowlingXI.length - 1];

    const currentOver = innings.completedOvers;
    const ballNumber = innings.ballsInCurrentOver + 1;

    // Pitch & phase calculation
    const isPowerplay = currentOver < 6;
    const isDeathOvers = currentOver >= 15;
    const aggression = this.currentAggression[innings.battingFranchiseId] || 'BALANCED';

    // Skill difference calculation
    let batSkill = striker.battingRating;
    let bowlSkill = bowler.bowlingRating;

    // Pitch modifiers
    if (this.match.pitchType === 'BATTING') batSkill += 6;
    if (this.match.pitchType === 'SPIN' && bowler.bowlingStyle.includes('Spin')) bowlSkill += 7;
    if (this.match.pitchType === 'BOWLING' && bowler.bowlingStyle.includes('Fast')) bowlSkill += 7;

    // Aggression modifiers
    let boundaryBoost = 0;
    let wicketRiskBoost = 0;

    switch (aggression) {
      case 'DEFENSIVE':
        boundaryBoost = -0.06;
        wicketRiskBoost = -0.04;
        break;
      case 'AGGRESSIVE':
        boundaryBoost = 0.08;
        wicketRiskBoost = 0.035;
        break;
      case 'MAXIMUM_ATTACK':
        boundaryBoost = 0.16;
        wicketRiskBoost = 0.08;
        break;
      default:
        break;
    }

    if (isPowerplay) boundaryBoost += 0.05;
    if (isDeathOvers) {
      boundaryBoost += 0.09;
      wicketRiskBoost += 0.04;
    }

    // Required Run Rate pressure in Innings 2
    if (innings.target) {
      const remainingRuns = innings.target - innings.totalRuns;
      const remainingBalls = 120 - (currentOver * 6 + innings.ballsInCurrentOver);
      const reqRate = remainingBalls > 0 ? (remainingRuns / remainingBalls) * 6 : 0;
      if (reqRate > 12) {
        boundaryBoost += 0.08;
        wicketRiskBoost += 0.05;
      }
    }

    // Outcome probabilities (Markov-style normalized distribution)
    const skillDiff = (batSkill - bowlSkill) / 100; // e.g. -0.1 to +0.15
    const wicketProb = Math.max(0.02, Math.min(0.2, 0.048 - skillDiff * 0.03 + wicketRiskBoost));
    const sixProb = Math.max(0.01, Math.min(0.2, 0.045 + skillDiff * 0.03 + boundaryBoost * 0.4));
    const fourProb = Math.max(0.03, Math.min(0.3, 0.12 + skillDiff * 0.04 + boundaryBoost * 0.6));
    const twoProb = 0.09;
    const oneProb = 0.36;
    // Remainder is dot ball (0 runs)

    const rand = Math.random();
    let runsScored = 0;
    let isWicket = false;
    let isFour = false;
    let isSix = false;
    let wicketType: BallEvent['wicketType'];
    let dismissedPlayerName: string | undefined;

    if (rand < wicketProb) {
      isWicket = true;
      const wRand = Math.random();
      if (wRand < 0.45) {
        wicketType = 'CAUGHT';
      } else if (wRand < 0.75) {
        wicketType = 'BOWLED';
      } else if (wRand < 0.9) {
        wicketType = 'LBW';
      } else if (wRand < 0.96) {
        wicketType = 'RUN_OUT';
      } else {
        wicketType = 'STUMPED';
      }
      dismissedPlayerName = striker.name;
    } else if (rand < wicketProb + sixProb) {
      runsScored = 6;
      isSix = true;
    } else if (rand < wicketProb + sixProb + fourProb) {
      runsScored = 4;
      isFour = true;
    } else if (rand < wicketProb + sixProb + fourProb + twoProb) {
      runsScored = 2;
    } else if (rand < wicketProb + sixProb + fourProb + twoProb + oneProb) {
      runsScored = 1;
    } else {
      runsScored = 0;
    }

    // Generate broadcast commentary
    const commentary = this.generateCommentary(
      striker.name,
      bowler.name,
      runsScored,
      isWicket,
      wicketType,
      isFour,
      isSix
    );

    // Update Innings Stats
    innings.totalRuns += runsScored;
    innings.ballsInCurrentOver++;

    // Update batsman stats
    const bStats = innings.batsmen[striker.id];
    if (bStats) {
      bStats.balls++;
      bStats.runs += runsScored;
      if (isFour) bStats.fours++;
      if (isSix) bStats.sixes++;
      if (isWicket) {
        bStats.isOut = true;
        bStats.dismissal =
          wicketType === 'BOWLED'
            ? `b ${bowler.name}`
            : wicketType === 'LBW'
            ? `lbw b ${bowler.name}`
            : wicketType === 'CAUGHT'
            ? `c sub b ${bowler.name}`
            : wicketType === 'STUMPED'
            ? `st keeper b ${bowler.name}`
            : 'run out';
      }
    }

    // Update bowler stats
    const bwStats = innings.bowlers[bowler.id];
    if (bwStats) {
      bwStats.ballsThisOver++;
      bwStats.runsConceded += runsScored;
      if (isWicket && wicketType !== 'RUN_OUT') {
        bwStats.wickets++;
      }
    }

    if (isWicket) {
      innings.totalWickets++;
      // Bring in next batsman if available
      if (innings.totalWickets < 10) {
        const nextBat = battingXI[innings.totalWickets + 1];
        if (nextBat) {
          innings.currentStrikerId = nextBat.id;
        }
      }
    } else if (runsScored === 1 || runsScored === 3) {
      // Rotate strike
      const temp = innings.currentStrikerId;
      innings.currentStrikerId = innings.currentNonStrikerId;
      innings.currentNonStrikerId = temp;
    }

    const event: BallEvent = {
      id: `ball_${currentOver}_${innings.ballsInCurrentOver}_${Date.now()}`,
      overIndex: currentOver,
      ballInOver: innings.ballsInCurrentOver,
      bowlerId: bowler.id,
      bowlerName: bowler.name,
      strikerId: striker.id,
      strikerName: striker.name,
      nonStrikerId: nonStriker.id,
      nonStrikerName: nonStriker.name,
      runsScored,
      extras: 0,
      isWicket,
      wicketType,
      dismissedPlayerName,
      isFour,
      isSix,
      commentary,
      totalTeamRuns: innings.totalRuns,
      totalTeamWickets: innings.totalWickets,
    };

    innings.ballEvents.unshift(event);

    // Over completion handling
    if (innings.ballsInCurrentOver === 6) {
      innings.completedOvers++;
      innings.ballsInCurrentOver = 0;
      innings.worm.push(innings.totalRuns);

      if (bwStats) {
        bwStats.overs++;
        bwStats.ballsThisOver = 0;
      }

      // Rotate strike at end of over
      const temp = innings.currentStrikerId;
      innings.currentStrikerId = innings.currentNonStrikerId;
      innings.currentNonStrikerId = temp;

      // Select next bowler (max 4 overs, cannot bowl consecutive overs)
      this.rotateBowler(innings, bowlingXI, bowler.id);
    }

    // Check innings completion conditions:
    // 1. All out (10 wickets)
    // 2. 20 overs finished
    // 3. Target achieved in Innings 2
    if (
      innings.totalWickets >= 10 ||
      innings.completedOvers >= 20 ||
      (innings.target && innings.totalRuns >= innings.target)
    ) {
      innings.isCompleted = true;
    }

    return event;
  }

  private rotateBowler(innings: InningsData, bowlingXI: Player[], lastBowlerId: string) {
    // Bowler can bowl max 4 overs, and not consecutive overs
    const eligibleBowlers = bowlingXI.filter((p) => {
      const stats = innings.bowlers[p.id];
      const oversBowled = (stats?.overs || 0) + (stats?.ballsThisOver ? stats.ballsThisOver / 6 : 0);
      return p.id !== lastBowlerId && oversBowled < 4;
    });

    if (eligibleBowlers.length === 0) return;

    // Prefer specialists in death overs or spinners in middle
    const currentOver = innings.completedOvers;
    let chosen: Player = eligibleBowlers[0];

    if (currentOver >= 15) {
      // Death overs: Fast bowlers preferred
      const deathPacers = eligibleBowlers.filter(
        (p) => p.bowlingStyle.includes('Fast') || p.tier === 'Marquee'
      );
      if (deathPacers.length > 0) {
        chosen = deathPacers.sort((a, b) => b.bowlingRating - a.bowlingRating)[0];
      }
    } else if (currentOver >= 6 && currentOver < 14) {
      // Middle overs: Spinners preferred
      const spinners = eligibleBowlers.filter((p) => p.bowlingStyle.includes('Spin') || p.bowlingStyle.includes('Break') || p.bowlingStyle.includes('Orthodox'));
      if (spinners.length > 0) {
        chosen = spinners.sort((a, b) => b.bowlingRating - a.bowlingRating)[0];
      }
    }

    innings.currentBowlerId = chosen.id;
  }

  private transitionToInnings2() {
    this.match.status = 'INNINGS_2';
    this.match.currentInnings = 2;
    const target = (this.match.innings1?.totalRuns || 0) + 1;
    const battingSecond = this.match.innings1?.bowlingFranchiseId!;
    const bowlingSecond = this.match.innings1?.battingFranchiseId!;
    this.match.innings2 = this.createEmptyInnings(battingSecond, bowlingSecond, target);
  }

  private finishMatch() {
    this.match.status = 'COMPLETED';

    const inn1 = this.match.innings1!;
    const inn2 = this.match.innings2!;

    let winner: FranchiseId | undefined;
    let winMargin = '';

    if (inn2.totalRuns >= (inn2.target || 0)) {
      winner = inn2.battingFranchiseId;
      const wicketsLeft = 10 - inn2.totalWickets;
      winMargin = `by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
    } else if (inn2.totalRuns < (inn1.totalRuns)) {
      winner = inn1.battingFranchiseId;
      const runsDiff = inn1.totalRuns - inn2.totalRuns;
      winMargin = `by ${runsDiff} runs`;
    } else {
      // Tie
      winner = inn1.battingFranchiseId;
      winMargin = 'won via Super Over';
    }

    this.match.winner = winner;
    this.match.winMargin = winMargin;

    // Determine Player of the Match
    this.determinePlayerOfTheMatch();
  }

  private determinePlayerOfTheMatch() {
    const candidates: Array<{ player: Player; team: FranchiseId; points: number; summary: string }> = [];

    // Analyze Innings 1
    if (this.match.innings1) {
      const inn1 = this.match.innings1;
      const battingXI = inn1.battingFranchiseId === this.match.homeTeam ? this.homeXI : this.awayXI;
      const bowlingXI = inn1.bowlingFranchiseId === this.match.homeTeam ? this.homeXI : this.awayXI;

      for (const p of battingXI) {
        const stats = inn1.batsmen[p.id];
        if (stats && stats.runs >= 30) {
          const points = stats.runs * 1.2 + (stats.runs >= 50 ? 20 : 0) + (stats.runs >= 100 ? 50 : 0);
          candidates.push({
            player: p,
            team: inn1.battingFranchiseId,
            points,
            summary: `${stats.runs} runs off ${stats.balls} balls`,
          });
        }
      }

      for (const p of bowlingXI) {
        const stats = inn1.bowlers[p.id];
        if (stats && stats.wickets >= 2) {
          const points = stats.wickets * 25 + Math.max(0, (24 - stats.runsConceded) * 1.5);
          candidates.push({
            player: p,
            team: inn1.bowlingFranchiseId,
            points,
            summary: `${stats.wickets}/${stats.runsConceded} in ${stats.overs} overs`,
          });
        }
      }
    }

    // Analyze Innings 2
    if (this.match.innings2) {
      const inn2 = this.match.innings2;
      const battingXI = inn2.battingFranchiseId === this.match.homeTeam ? this.homeXI : this.awayXI;
      const bowlingXI = inn2.bowlingFranchiseId === this.match.homeTeam ? this.homeXI : this.awayXI;

      for (const p of battingXI) {
        const stats = inn2.batsmen[p.id];
        if (stats && stats.runs >= 30) {
          const points = stats.runs * 1.2 + (stats.runs >= 50 ? 20 : 0) + (stats.runs >= 100 ? 50 : 0);
          candidates.push({
            player: p,
            team: inn2.battingFranchiseId,
            points,
            summary: `${stats.runs} runs off ${stats.balls} balls`,
          });
        }
      }

      for (const p of bowlingXI) {
        const stats = inn2.bowlers[p.id];
        if (stats && stats.wickets >= 2) {
          const points = stats.wickets * 25 + Math.max(0, (24 - stats.runsConceded) * 1.5);
          candidates.push({
            player: p,
            team: inn2.bowlingFranchiseId,
            points,
            summary: `${stats.wickets}/${stats.runsConceded} in ${stats.overs} overs`,
          });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.points - a.points);
      const top = candidates[0];
      this.match.playerOfTheMatch = {
        id: top.player.id,
        name: top.player.name,
        team: top.team,
        performance: top.summary,
      };
    }
  }

  private generateCommentary(
    striker: string,
    bowler: string,
    runs: number,
    isWicket: boolean,
    wicketType?: string,
    isFour?: boolean,
    isSix?: boolean
  ): string {
    if (isWicket) {
      if (wicketType === 'BOWLED') {
        return `OUT! Bowled him! ${bowler} cleans up ${striker}! The off-stump goes cartwheeling under the floodlights!`;
      }
      if (wicketType === 'LBW') {
        return `OUT! Huge appeal and given! That jagged back sharp, striking ${striker} plumb in front!`;
      }
      if (wicketType === 'CAUGHT') {
        return `OUT! In the air... and taken! ${striker} misjudges the flight and holes out in the deep!`;
      }
      if (wicketType === 'STUMPED') {
        return `OUT! Beaten in the air, dragged foot out, and lightning hands from the keeper whip off the bails!`;
      }
      return `OUT! Mix-up in the middle! ${striker} is run out by yards!`;
    }

    if (isSix) {
      const phrases = [
        `SIX! Massive hit! ${striker} stands tall and deposits this 95 metres into the upper deck!`,
        `SIX! High, handsome and all the way over long-on! That is classic T20 hitting from ${striker}!`,
        `SIX! Clean strike! Clears the front leg and smashes ${bowler} into the ecstatic crowd!`,
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (isFour) {
      const phrases = [
        `FOUR! Creamed through extra cover! Pierces the gap with pinpoint elegance!`,
        `FOUR! Short and punished! ${striker} pounces on the back foot and pulls it away to the fence!`,
        `FOUR! Edged but fine! Races away past third man for a rapid boundary!`,
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (runs === 2) {
      return `Pushed into the deep pocket, good hustle between the wickets for a comfortable brace.`;
    }

    if (runs === 1) {
      return `Dabbed to mid-wicket, quick single taken to rotate the strike.`;
    }

    // Dot ball
    const dotPhrases = [
      `No run. Beaten outside off-stump with good seam movement.`,
      `Defended solid on the front foot back to ${bowler}.`,
      `Dot ball. Good tight line, keeping ${striker} quiet.`,
    ];
    return dotPhrases[Math.floor(Math.random() * dotPhrases.length)];
  }
}

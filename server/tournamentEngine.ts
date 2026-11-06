import {
  FranchiseId,
  MatchData,
  PointsTableEntry,
  RoomConfig,
  TournamentLeader,
  TournamentState,
} from '../src/types/cricket';
import { IPL_FRANCHISES } from '../src/data/teams';

export class TournamentEngine {
  private state: TournamentState;
  private config: RoomConfig;

  constructor(config: RoomConfig) {
    this.config = config;
    this.state = {
      currentRound: 1,
      totalLeagueRounds: config.leagueLength === 'CONDENSED' ? 9 : 18,
      currentMatchIndex: 0,
      matches: [],
      pointsTable: this.initializePointsTable(),
    };

    this.generateFixtures();
  }

  public getState(): TournamentState {
    return { ...this.state };
  }

  private initializePointsTable(): PointsTableEntry[] {
    const franchises: FranchiseId[] = [
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

    return franchises.map((fId) => ({
      franchiseId: fId,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsScored: 0,
      oversFaced: 0,
      runsConceded: 0,
      oversBowled: 0,
      netRunRate: 0.0,
      form: [],
    }));
  }

  private generateFixtures() {
    const teams: FranchiseId[] = [
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

    // Standard round-robin scheduling (Berger tables algorithm)
    const n = teams.length;
    const rounds = n - 1; // 9 rounds for single round-robin
    const half = n / 2;

    const roundList: Array<Array<[FranchiseId, FranchiseId]>> = [];
    const teamIndices = teams.map((_, i) => i);

    for (let r = 0; r < rounds; r++) {
      const pairings: Array<[FranchiseId, FranchiseId]> = [];
      for (let i = 0; i < half; i++) {
        const t1 = teams[teamIndices[i]];
        const t2 = teams[teamIndices[n - 1 - i]];
        // Alternate home/away
        pairings.push(r % 2 === 0 ? [t1, t2] : [t2, t1]);
      }
      roundList.push(pairings);
      // Rotate indices except first
      teamIndices.splice(1, 0, teamIndices.pop()!);
    }

    const matches: MatchData[] = [];
    let matchNum = 1;

    // League matches
    for (let r = 0; r < roundList.length; r++) {
      for (const [home, away] of roundList[r]) {
        matches.push({
          id: `match_league_${matchNum}`,
          matchNumber: matchNum++,
          stage: 'LEAGUE',
          homeTeam: home,
          awayTeam: away,
          venue: IPL_FRANCHISES[home]?.homeVenue || 'Wankhede Stadium',
          pitchType: this.getPitchTypeForVenue(home),
          status: 'SCHEDULED',
          currentInnings: 1,
        });
      }
    }

    // If FULL double round robin, reverse fixtures
    if (this.config.leagueLength === 'FULL') {
      for (let r = 0; r < roundList.length; r++) {
        for (const [home, away] of roundList[r]) {
          matches.push({
            id: `match_league_${matchNum}`,
            matchNumber: matchNum++,
            stage: 'LEAGUE',
            homeTeam: away,
            awayTeam: home,
            venue: IPL_FRANCHISES[away]?.homeVenue || 'Eden Gardens',
            pitchType: this.getPitchTypeForVenue(away),
            status: 'SCHEDULED',
            currentInnings: 1,
          });
        }
      }
    }

    this.state.matches = matches;
  }

  private getPitchTypeForVenue(home: FranchiseId): 'BATTING' | 'BOWLING' | 'SPIN' | 'BALANCED' {
    switch (home) {
      case 'RCB':
      case 'MI':
        return 'BATTING';
      case 'CSK':
      case 'LSG':
        return 'SPIN';
      case 'GT':
      case 'KKR':
        return 'BALANCED';
      default:
        return 'BOWLING';
    }
  }

  public onMatchCompleted(completedMatch: MatchData) {
    // Update match in list
    const idx = this.state.matches.findIndex((m) => m.id === completedMatch.id);
    if (idx !== -1) {
      this.state.matches[idx] = completedMatch;
    }

    // Only update league table for league matches
    if (completedMatch.stage === 'LEAGUE') {
      this.updatePointsTable(completedMatch);
    }

    // Update statistical leaders (Orange & Purple Caps)
    this.updateTournamentLeaders();

    // Check if league stage is done to trigger playoffs
    this.checkAndSchedulePlayoffs();
  }

  private updatePointsTable(match: MatchData) {
    if (!match.winner || !match.innings1 || !match.innings2) return;

    const t1 = match.innings1.battingFranchiseId;
    const t2 = match.innings2.battingFranchiseId;

    const row1 = this.state.pointsTable.find((r) => r.franchiseId === t1);
    const row2 = this.state.pointsTable.find((r) => r.franchiseId === t2);

    if (!row1 || !row2) return;

    row1.played++;
    row2.played++;

    if (match.winner === t1) {
      row1.won++;
      row1.points += 2;
      row1.form.push('W');
      row2.lost++;
      row2.form.push('L');
    } else if (match.winner === t2) {
      row2.won++;
      row2.points += 2;
      row2.form.push('W');
      row1.lost++;
      row1.form.push('L');
    }

    // Official NRR rules:
    // If a team is dismissed all-out, full 20 overs are counted
    const t1OversFaced = match.innings1.totalWickets >= 10 ? 20 : match.innings1.completedOvers + match.innings1.ballsInCurrentOver / 6;
    const t2OversFaced = match.innings2.totalWickets >= 10 ? 20 : match.innings2.completedOvers + match.innings2.ballsInCurrentOver / 6;

    row1.runsScored += match.innings1.totalRuns;
    row1.oversFaced += t1OversFaced;
    row1.runsConceded += match.innings2.totalRuns;
    row1.oversBowled += t2OversFaced;

    row2.runsScored += match.innings2.totalRuns;
    row2.oversFaced += t2OversFaced;
    row2.runsConceded += match.innings1.totalRuns;
    row2.oversBowled += t1OversFaced;

    // Recalculate NRR
    for (const r of [row1, row2]) {
      const batRate = r.oversFaced > 0 ? r.runsScored / r.oversFaced : 0;
      const bowlRate = r.oversBowled > 0 ? r.runsConceded / r.oversBowled : 0;
      r.netRunRate = parseFloat((batRate - bowlRate).toFixed(3));
    }

    // Sort table by Points DESC, then NRR DESC, then Won DESC
    this.state.pointsTable.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.netRunRate !== a.netRunRate) return b.netRunRate - a.netRunRate;
      return b.won - a.won;
    });
  }

  private updateTournamentLeaders() {
    const runsMap: Record<string, { name: string; team: FranchiseId; runs: number }> = {};
    const wicketsMap: Record<string, { name: string; team: FranchiseId; wickets: number }> = {};

    for (const m of this.state.matches) {
      if (m.status !== 'COMPLETED') continue;

      for (const inn of [m.innings1, m.innings2]) {
        if (!inn) continue;
        for (const [id, stats] of Object.entries(inn.batsmen)) {
          if (!runsMap[id]) {
            runsMap[id] = { name: stats.name, team: inn.battingFranchiseId, runs: 0 };
          }
          runsMap[id].runs += stats.runs;
        }

        for (const [id, stats] of Object.entries(inn.bowlers)) {
          if (!wicketsMap[id]) {
            wicketsMap[id] = { name: stats.name, team: inn.bowlingFranchiseId, wickets: 0 };
          }
          wicketsMap[id].wickets += stats.wickets;
        }
      }
    }

    // Orange Cap
    const topRunScorer = Object.entries(runsMap).sort((a, b) => b[1].runs - a[1].runs)[0];
    if (topRunScorer) {
      this.state.orangeCapLeader = {
        playerId: topRunScorer[0],
        playerName: topRunScorer[1].name,
        franchiseId: topRunScorer[1].team,
        value: topRunScorer[1].runs,
        subText: `${topRunScorer[1].runs} Runs`,
      };
    }

    // Purple Cap
    const topWicketTaker = Object.entries(wicketsMap).sort((a, b) => b[1].wickets - a[1].wickets)[0];
    if (topWicketTaker) {
      this.state.purpleCapLeader = {
        playerId: topWicketTaker[0],
        playerName: topWicketTaker[1].name,
        franchiseId: topWicketTaker[1].team,
        value: topWicketTaker[1].wickets,
        subText: `${topWicketTaker[1].wickets} Wickets`,
      };
    }
  }

  private checkAndSchedulePlayoffs() {
    const leagueMatches = this.state.matches.filter((m) => m.stage === 'LEAGUE');
    const allLeagueDone = leagueMatches.every((m) => m.status === 'COMPLETED');

    if (!allLeagueDone) return;

    // Check if playoff matches already created
    const hasPlayoffs = this.state.matches.some((m) => m.stage === 'QUALIFIER_1');
    if (!hasPlayoffs) {
      // Top 4 teams qualify
      const top4 = this.state.pointsTable.slice(0, 4).map((r) => r.franchiseId);
      if (top4.length < 4) return;

      const q1Match: MatchData = {
        id: 'playoff_q1',
        matchNumber: leagueMatches.length + 1,
        stage: 'QUALIFIER_1',
        homeTeam: top4[0],
        awayTeam: top4[1],
        venue: 'Narendra Modi Stadium, Ahmedabad',
        pitchType: 'BALANCED',
        status: 'SCHEDULED',
        currentInnings: 1,
      };

      const elimMatch: MatchData = {
        id: 'playoff_elim',
        matchNumber: leagueMatches.length + 2,
        stage: 'ELIMINATOR',
        homeTeam: top4[2],
        awayTeam: top4[3],
        venue: 'M.A. Chidambaram Stadium, Chepauk',
        pitchType: 'SPIN',
        status: 'SCHEDULED',
        currentInnings: 1,
      };

      this.state.matches.push(q1Match, elimMatch);
    } else {
      // Check if Qualifier 1 and Eliminator are done, create Qualifier 2
      const q1 = this.state.matches.find((m) => m.stage === 'QUALIFIER_1');
      const elim = this.state.matches.find((m) => m.stage === 'ELIMINATOR');
      const q2 = this.state.matches.find((m) => m.stage === 'QUALIFIER_2');

      if (q1?.status === 'COMPLETED' && elim?.status === 'COMPLETED' && !q2) {
        const loserQ1 = q1.winner === q1.homeTeam ? q1.awayTeam : q1.homeTeam;
        const winnerElim = elim.winner!;

        const q2Match: MatchData = {
          id: 'playoff_q2',
          matchNumber: this.state.matches.length + 1,
          stage: 'QUALIFIER_2',
          homeTeam: loserQ1,
          awayTeam: winnerElim,
          venue: 'Eden Gardens, Kolkata',
          pitchType: 'BALANCED',
          status: 'SCHEDULED',
          currentInnings: 1,
        };
        this.state.matches.push(q2Match);
      }

      // Check if Qualifier 2 is completed, schedule Grand Final
      const q2Completed = this.state.matches.find((m) => m.stage === 'QUALIFIER_2');
      const finalMatch = this.state.matches.find((m) => m.stage === 'FINAL');

      if (q1?.status === 'COMPLETED' && q2Completed?.status === 'COMPLETED' && !finalMatch) {
        const winnerQ1 = q1.winner!;
        const winnerQ2 = q2Completed.winner!;

        const theFinal: MatchData = {
          id: 'playoff_final',
          matchNumber: this.state.matches.length + 1,
          stage: 'FINAL',
          homeTeam: winnerQ1,
          awayTeam: winnerQ2,
          venue: 'Narendra Modi Stadium, Ahmedabad',
          pitchType: 'BATTING',
          status: 'SCHEDULED',
          currentInnings: 1,
        };
        this.state.matches.push(theFinal);
      }

      // If Final is completed, crown Champion!
      if (finalMatch && finalMatch.status === 'COMPLETED') {
        this.state.champion = finalMatch.winner;
        this.state.runnerUp =
          finalMatch.winner === finalMatch.homeTeam ? finalMatch.awayTeam : finalMatch.homeTeam;
      }
    }
  }
}

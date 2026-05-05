package com.rpl.auction.cricheroes.service;

import com.rpl.auction.cricheroes.dto.*;
import com.rpl.auction.auction.repository.AuctionRepository;
import com.rpl.auction.auction.repository.BidRepository;
import com.rpl.auction.auction.repository.DraftPickRepository;
import com.rpl.auction.history.repository.PlayerHistoryRepository;
import com.rpl.auction.history.repository.TeamStandingRepository;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.match.entity.BattingPerformance;
import com.rpl.auction.match.entity.BowlingPerformance;
import com.rpl.auction.match.entity.Innings;
import com.rpl.auction.match.entity.Match;
import com.rpl.auction.match.repository.BattingPerformanceRepository;
import com.rpl.auction.match.repository.BowlingPerformanceRepository;
import com.rpl.auction.match.repository.InningsRepository;
import com.rpl.auction.match.repository.MatchRepository;
import com.rpl.auction.player.entity.Player;
import com.rpl.auction.player.repository.PlayerRepository;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import com.rpl.auction.tournament.entity.Tournament;
import com.rpl.auction.tournament.service.TournamentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CricheroesImportService {

    private final CricheroesScraperService scraper;
    private final LeagueRepository leagueRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;
    private final BattingPerformanceRepository battingPerformanceRepository;
    private final BowlingPerformanceRepository bowlingPerformanceRepository;
    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final DraftPickRepository draftPickRepository;
    private final PlayerHistoryRepository playerHistoryRepository;
    private final TeamStandingRepository teamStandingRepository;
    private final TournamentService tournamentService;

    @Async
    @Transactional
    public void runTournamentImport(String tournamentUrl, Long leagueId, String seasonDisplayNameOverride, Boolean overrideExisting, ImportProgress progress) {
        try {
            progress.setStatus(ImportProgress.Status.RUNNING);
            progress.setCurrentStep("Fetching tournament");
            ScrapedTournament t = scraper.scrapeTournament(tournamentUrl);

            League league = upsertLeague(t, leagueId, seasonDisplayNameOverride);
            if (Boolean.TRUE.equals(overrideExisting)) {
                progress.setCurrentStep("Overriding existing league data");
                purgeLeagueTournamentData(league.getId());
            }
            progress.setLeagueId(league.getId());

            progress.setCurrentStep("Importing teams");
            progress.setTeamsTotal(t.teamIds().size());
            for (Long ctid : t.teamIds()) {
                try {
                    importTeam(ctid, league);
                    progress.setTeamsDone(progress.getTeamsDone() + 1);
                } catch (Exception e) {
                    log.warn("Failed team {}: {}", ctid, e.getMessage());
                    progress.addWarning("Team " + ctid + ": " + e.getMessage());
                }
            }

            progress.setCurrentStep("Importing matches");
            progress.setMatchesTotal(t.matches().size());
            for (ScrapedMatchSummary m : t.matches()) {
                if (matchRepository.existsByCricheroesId(m.cricheroesMatchId())) {
                    progress.setMatchesSkipped(progress.getMatchesSkipped() + 1);
                    progress.setMatchesDone(progress.getMatchesDone() + 1);
                    continue;
                }
                try {
                    importScorecard(m.cricheroesMatchId(), t.slug(), m.slug(), league);
                    progress.setMatchesDone(progress.getMatchesDone() + 1);
                } catch (Exception e) {
                    log.warn("Failed match {}: {}", m.cricheroesMatchId(), e.getMessage());
                    progress.addWarning("Match " + m.cricheroesMatchId() + ": " + e.getMessage());
                    progress.setMatchesDone(progress.getMatchesDone() + 1);
                }
            }

            progress.setStatus(ImportProgress.Status.COMPLETED);
            progress.setCurrentStep("Done");
        } catch (Exception e) {
            log.error("Tournament import failed", e);
            progress.setStatus(ImportProgress.Status.FAILED);
            progress.setErrorMessage(e.getMessage());
        } finally {
            progress.setFinishedAt(java.time.Instant.now());
        }
    }

    @Transactional(readOnly = true)
    public TournamentImportCheckResponse checkTournamentImport(String tournamentUrl) {
        Long cricheroesId = scraper.extractTournamentId(tournamentUrl);
        Optional<League> existing = leagueRepository.findAnyByCricheroesId(cricheroesId);
        if (existing.isEmpty()) {
            return TournamentImportCheckResponse.builder()
                    .exists(false)
                    .cricheroesId(cricheroesId)
                    .build();
        }
        League l = existing.get();
        return TournamentImportCheckResponse.builder()
                .exists(true)
                .cricheroesId(cricheroesId)
                .leagueId(l.getId())
                .leagueName(l.getName())
                .season(l.getSeason())
                .seasonDisplayName(l.getSeasonDisplayName())
                .build();
    }

    @Transactional
    public League upsertLeague(ScrapedTournament t, Long preferredLeagueId, String seasonDisplayNameOverride) {
        String season = t.season() != null ? t.season() : t.name();
        String seasonDisplayName = (seasonDisplayNameOverride != null && !seasonDisplayNameOverride.isBlank())
                ? seasonDisplayNameOverride.trim()
                : (t.seasonDisplayName() != null ? t.seasonDisplayName() : t.name());

        // Resolve parent Tournament from cricheroes brand name (strip trailing year)
        String brand = stripTrailingYear(t.name());
        Tournament tournament = tournamentService.upsertByCricheroesBrand(brand);

        if (preferredLeagueId != null) {
            League existing = leagueRepository.findById(preferredLeagueId)
                    .orElseThrow(() -> new IllegalArgumentException("League not found: " + preferredLeagueId));
            if (existing.getCricheroesId() == null) {
                existing.setCricheroesId(t.cricheroesId());
            }
            existing.setSeason(season);
            existing.setSeasonDisplayName(seasonDisplayName);
            if (existing.getTournament() == null && tournament != null) existing.setTournament(tournament);
            leagueRepository.save(existing);
            return existing;
        }
        Optional<League> byCh = leagueRepository.findAnyByCricheroesId(t.cricheroesId());
        if (byCh.isPresent()) {
            League existing = byCh.get();
            leagueRepository.reviveAndUpdateImportedLeagueById(
                    existing.getId(),
                    t.name(),
                    season,
                    seasonDisplayName,
                    t.cricheroesId()
            );
            League refreshed = leagueRepository.findById(existing.getId())
                    .orElseThrow(() -> new IllegalStateException("League not found after revive/update: " + existing.getId()));
            if (refreshed.getTournament() == null && tournament != null) {
                leagueRepository.updateTournamentId(refreshed.getId(), tournament.getId());
                refreshed.setTournament(tournament);
            }
            return refreshed;
        }

        League league = League.builder()
                .name(t.name())
                .season(season)
                .seasonDisplayName(seasonDisplayName)
                .status(League.LeagueStatus.COMPLETED)
                .teamBudget(BigDecimal.ZERO)
                .maxPlayersPerTeam(15)
                .minPlayersPerTeam(11)
                .minWomenPerTeam(0)
                .maxRetentionsPerTeam(0)
                .retentionCost(BigDecimal.ZERO)
                .bidIncrement(new BigDecimal("0.5"))
                .timerSeconds(30)
                .cricheroesId(t.cricheroesId())
                .tournament(tournament)
                .build();
        return leagueRepository.save(league);
    }

    /** "Recykal Premier League 2025" → "Recykal Premier League". */
    private String stripTrailingYear(String name) {
        if (name == null) return null;
        return name.replaceAll("\\s+\\d{4}\\s*$", "").trim();
    }

    @Transactional
    public Team importTeam(Long cricheroesTeamId, League league) {
        ScrapedTeam st = scraper.scrapeTeam(cricheroesTeamId);
        Team team = teamRepository.findAnyByCricheroesIdAndLeagueId(st.cricheroesId(), league.getId())
                .orElseGet(() -> Team.builder()
                        .league(league)
                        .name(st.name())
                        .shortName(buildShortName(st))
                        .budget(BigDecimal.ZERO)
                        .budgetSpent(BigDecimal.ZERO)
                        .cricheroesId(st.cricheroesId())
                        .build());
        team.setName(st.name());
        team.setLogoUrl(st.logo());
        team.setLeague(league);
        team.setArchived(false);
        if (team.getShortName() == null || team.getShortName().isBlank()) {
            team.setShortName(buildShortName(st));
        }
        team = teamRepository.save(team);

        for (ScrapedPlayer sp : st.players()) {
            upsertPlayer(sp, league, team);
        }
        return team;
    }

    @Transactional
    public Player upsertPlayer(ScrapedPlayer sp, League league, Team team) {
        Player p = playerRepository.findAnyByCricheroesIdAndLeagueId(sp.cricheroesId(), league.getId())
                .orElseGet(() -> Player.builder()
                        .name(sp.name())
                        .category(Player.PlayerCategory.CRICKET)
                        .basePrice(BigDecimal.ZERO)
                        .league(league)
                        .status(Player.PlayerStatus.SOLD)
                        .soldPrice(BigDecimal.ZERO)
                        .isCaptain(sp.isCaptain())
                        .cricheroesId(sp.cricheroesId())
                        .photoUrl(sp.profilePhoto())
                        .source(Player.PlayerSource.CRICHEROES)
                        .build());
        p.setName(sp.name());
        p.setLeague(league);
        p.setTeam(team);
        p.setIsCaptain(sp.isCaptain());
        p.setPhotoUrl(sp.profilePhoto());
        p.setSource(Player.PlayerSource.CRICHEROES);
        p.setArchived(false);
        if (p.getStatus() == null) p.setStatus(Player.PlayerStatus.SOLD);
        if (p.getCategory() == null) p.setCategory(Player.PlayerCategory.CRICKET);
        if (p.getBasePrice() == null) p.setBasePrice(BigDecimal.ZERO);
        return playerRepository.save(p);
    }

    @Transactional
    public Match importScorecard(Long cricheroesMatchId, String tournamentSlug, String matchSlug, League league) {
        ScrapedScorecard sc = scraper.scrapeScorecard(cricheroesMatchId, tournamentSlug, matchSlug);

        Team teamA = resolveTeamForImport(sc.teamAId(), sc.teamAName(), league);
        Team teamB = resolveTeamForImport(sc.teamBId(), sc.teamBName(), league);

        Match match = matchRepository.findAnyByCricheroesId(sc.cricheroesMatchId())
                .orElseGet(() -> Match.builder()
                        .league(league)
                        .cricheroesId(sc.cricheroesMatchId())
                        .teamA(teamA)
                        .teamB(teamB)
                        .status(Match.MatchStatus.COMPLETED)
                        .build());
        match.setLeague(league);
        match.setTeamA(teamA);
        match.setTeamB(teamB);
        match.setScheduledAt(sc.startDateTime());
        match.setVenue(sc.groundName());
        match.setFormat(sc.matchType());
        match.setOvers(sc.overs());
        match.setStatus(Match.MatchStatus.COMPLETED);
        match.setArchived(false);
        match.setResultText(buildResultText(sc));
        if (sc.winningTeamName() != null) {
            if (sc.winningTeamName().equalsIgnoreCase(teamA.getName())) match.setWinnerTeam(teamA);
            else if (sc.winningTeamName().equalsIgnoreCase(teamB.getName())) match.setWinnerTeam(teamB);
        }
        match = matchRepository.save(match);

        for (ScrapedInnings si : sc.innings()) {
            persistInnings(match, si, teamA, teamB, league);
        }
        return match;
    }

    private void persistInnings(Match match, ScrapedInnings si, Team teamA, Team teamB, League league) {
        Team battingTeam = si.battingTeamId() != null && si.battingTeamId().equals(teamA.getCricheroesId()) ? teamA
                : (si.battingTeamId() != null && si.battingTeamId().equals(teamB.getCricheroesId()) ? teamB : null);
        if (battingTeam == null) {
            battingTeam = teamA.getName().equalsIgnoreCase(si.battingTeamName()) ? teamA : teamB;
        }
        Team bowlingTeam = battingTeam == teamA ? teamB : teamA;

        Innings innings = Innings.builder()
                .match(match)
                .inningsNumber(si.inningNumber())
                .battingTeam(battingTeam)
                .bowlingTeam(bowlingTeam)
                .totalRuns(si.totalRuns() != null ? si.totalRuns() : 0)
                .wickets(si.totalWickets() != null ? si.totalWickets() : 0)
                .overs(si.oversPlayed())
                .extras(si.extras() != null ? si.extras() : 0)
                .build();
        innings = inningsRepository.save(innings);

        Map<Long, Player> playerCache = new HashMap<>();

        for (ScrapedBatting b : si.batting()) {
            Player player = resolvePlayerForImport(b.cricheroesPlayerId(), b.name(), league, battingTeam, playerCache);
            BattingPerformance bp = BattingPerformance.builder()
                    .innings(innings)
                    .player(player)
                    .position(b.position())
                    .runs(b.runs() != null ? b.runs() : 0)
                    .balls(b.balls() != null ? b.balls() : 0)
                    .fours(b.fours() != null ? b.fours() : 0)
                    .sixes(b.sixes() != null ? b.sixes() : 0)
                    .strikeRate(b.strikeRate())
                    .dismissalText(b.howOut())
                    .build();
            battingPerformanceRepository.save(bp);
        }

        for (ScrapedBowling bw : si.bowling()) {
            Player player = resolvePlayerForImport(bw.cricheroesPlayerId(), bw.name(), league, bowlingTeam, playerCache);
            BowlingPerformance bp = BowlingPerformance.builder()
                    .innings(innings)
                    .player(player)
                    .overs(bw.overs())
                    .maidens(bw.maidens() != null ? bw.maidens() : 0)
                    .runs(bw.runs() != null ? bw.runs() : 0)
                    .wickets(bw.wickets() != null ? bw.wickets() : 0)
                    .economy(bw.economy())
                    .build();
            bowlingPerformanceRepository.save(bp);
        }
    }

    private Team resolveTeamForImport(Long cricheroesTeamId, String name, League league) {
        if (cricheroesTeamId != null && cricheroesTeamId > 0) {
            Optional<Team> existing = teamRepository.findAnyByCricheroesIdAndLeagueId(cricheroesTeamId, league.getId());
            if (existing.isPresent()) {
                Team t = existing.get();
                if (Boolean.TRUE.equals(t.getArchived())) {
                    t.setArchived(false);
                    return teamRepository.save(t);
                }
                return t;
            }
        }
        // Stub team if not yet imported in this league
        Team t = Team.builder()
                .league(league)
                .name(name != null ? name : "Team " + cricheroesTeamId)
                .shortName(buildShortNameFromName(name))
                .budget(BigDecimal.ZERO)
                .budgetSpent(BigDecimal.ZERO)
                .cricheroesId(cricheroesTeamId)
                .build();
        return teamRepository.save(t);
    }

    private Player resolvePlayerForImport(Long cricheroesPlayerId, String name, League league, Team team,
                                          Map<Long, Player> cache) {
        if (cricheroesPlayerId != null && cache.containsKey(cricheroesPlayerId)) {
            return cache.get(cricheroesPlayerId);
        }
        Player p = (cricheroesPlayerId != null && cricheroesPlayerId > 0)
                ? playerRepository.findAnyByCricheroesIdAndLeagueId(cricheroesPlayerId, league.getId()).orElse(null)
                : null;
        if (p == null) {
            p = Player.builder()
                    .name(stripNameSuffix(name))
                    .category(Player.PlayerCategory.CRICKET)
                    .basePrice(BigDecimal.ZERO)
                    .league(league)
                    .team(team)
                    .status(Player.PlayerStatus.SOLD)
                    .soldPrice(BigDecimal.ZERO)
                    .isCaptain(false)
                    .cricheroesId(cricheroesPlayerId)
                    .source(Player.PlayerSource.CRICHEROES)
                    .build();
            p = playerRepository.save(p);
        } else {
            boolean dirty = false;
            if (Boolean.TRUE.equals(p.getArchived())) { p.setArchived(false); dirty = true; }
            if (p.getTeam() == null && team != null) { p.setTeam(team); dirty = true; }
            if (dirty) p = playerRepository.save(p);
        }
        if (cricheroesPlayerId != null) cache.put(cricheroesPlayerId, p);
        return p;
    }

    private String stripNameSuffix(String name) {
        if (name == null) return "Unknown";
        return name.replaceAll("\\s*\\((wk|c|wk/c|c/wk)\\)\\s*$", "").trim();
    }

    private String buildShortName(ScrapedTeam st) {
        if (st.shortName() != null && !st.shortName().isBlank()) return st.shortName();
        return buildShortNameFromName(st.name());
    }

    private String buildShortNameFromName(String name) {
        if (name == null || name.isBlank()) return "TBD";
        String[] words = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (sb.length() >= 4) break;
            if (!w.isEmpty()) sb.append(Character.toUpperCase(w.charAt(0)));
        }
        if (sb.length() < 2 && name.length() >= 3) {
            return name.substring(0, 3).toUpperCase();
        }
        return sb.toString();
    }

    private String buildResultText(ScrapedScorecard sc) {
        if (sc.winningTeamName() != null && sc.winBy() != null) {
            return sc.winningTeamName() + " won by " + sc.winBy();
        }
        return sc.winBy();
    }

    @Transactional
    public Team importTeamPublic(Long cricheroesTeamId, Long leagueId) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new IllegalArgumentException("League not found: " + leagueId));
        return importTeam(cricheroesTeamId, league);
    }

    @Transactional
    public Match importMatchPublic(Long cricheroesMatchId, String tournamentSlug, String matchSlug, Long leagueId) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new IllegalArgumentException("League not found: " + leagueId));
        if (matchRepository.existsByCricheroesId(cricheroesMatchId)) {
            return matchRepository.findAnyByCricheroesId(cricheroesMatchId).orElseThrow();
        }
        return importScorecard(cricheroesMatchId, tournamentSlug, matchSlug, league);
    }

    /** Force-rescrape: wipe innings + perf for match then re-import. */
    @Transactional
    public Match reimportMatch(Long cricheroesMatchId, String tournamentSlug, String matchSlug, Long leagueId) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new IllegalArgumentException("League not found: " + leagueId));
        Optional<Match> existing = matchRepository.findAnyByCricheroesId(cricheroesMatchId);
        if (existing.isPresent()) {
            Match m = existing.get();
            List<Long> inningsIds = inningsRepository.findByMatchIdOrderByInningsNumberAsc(m.getId())
                    .stream().map(Innings::getId).toList();
            if (!inningsIds.isEmpty()) {
                battingPerformanceRepository.deleteByInningsIdIn(inningsIds);
                bowlingPerformanceRepository.deleteByInningsIdIn(inningsIds);
                inningsRepository.deleteByMatchIdIn(List.of(m.getId()));
            }
        }
        return importScorecard(cricheroesMatchId, tournamentSlug, matchSlug, league);
    }

    private void purgeLeagueTournamentData(Long leagueId) {
        // 1. Wipe matches/innings/perf belonging to this league
        List<Long> matchIds = matchRepository.findAnyIdsByLeagueId(leagueId);
        if (!matchIds.isEmpty()) {
            List<Long> inningsIds = inningsRepository.findIdsByMatchIdIn(matchIds);
            if (!inningsIds.isEmpty()) {
                battingPerformanceRepository.deleteByInningsIdIn(inningsIds);
                bowlingPerformanceRepository.deleteByInningsIdIn(inningsIds);
                inningsRepository.deleteByMatchIdIn(matchIds);
            }
            matchRepository.hardDeleteByLeagueId(leagueId);
        }

        // 2. Auctions chain
        List<Long> auctionIds = auctionRepository.findAnyIdsByLeagueId(leagueId);
        if (!auctionIds.isEmpty()) {
            bidRepository.deleteByAuctionIdIn(auctionIds);
            draftPickRepository.deleteByAuctionIdIn(auctionIds);
            auctionRepository.hardDeleteByLeagueId(leagueId);
        }

        // 3. History/standings
        playerHistoryRepository.deleteByLeagueId(leagueId);
        teamStandingRepository.deleteByLeagueId(leagueId);

        // 4. Cross-league legacy cleanup. From pre-migration era when teams/players
        //    were globally shared, OTHER leagues' matches/innings/perf rows may reference
        //    this league's teams or players. Wipe those before deleting our teams/players.
        List<Long> teamIds = teamRepository.findAnyIdsByLeagueId(leagueId);
        if (!teamIds.isEmpty()) {
            // Cross-league innings referencing our teams
            List<Long> orphanInningsIds = inningsRepository.findIdsByAnyTeamIdIn(teamIds);
            if (!orphanInningsIds.isEmpty()) {
                battingPerformanceRepository.deleteByInningsIdIn(orphanInningsIds);
                bowlingPerformanceRepository.deleteByInningsIdIn(orphanInningsIds);
                inningsRepository.hardDeleteByAnyTeamIdIn(teamIds);
            }
            // Cross-league matches referencing our teams (after their innings gone)
            matchRepository.hardDeleteByAnyTeamIdIn(teamIds);
            // Players parked under our teams whose league_id is elsewhere
            List<Long> orphanPlayerIds = playerRepository.findAnyIdsByTeamIdIn(teamIds);
            if (!orphanPlayerIds.isEmpty()) {
                battingPerformanceRepository.deleteByPlayerIdIn(orphanPlayerIds);
                bowlingPerformanceRepository.deleteByPlayerIdIn(orphanPlayerIds);
                playerRepository.hardDeleteByTeamIdIn(teamIds);
            }
        }

        // 5. Cross-league perf rows still referencing our players (any innings)
        List<Long> playerIds = playerRepository.findAnyIdsByLeagueId(leagueId);
        if (!playerIds.isEmpty()) {
            battingPerformanceRepository.deleteByPlayerIdIn(playerIds);
            bowlingPerformanceRepository.deleteByPlayerIdIn(playerIds);
        }

        // 6. Finally drop our players + teams
        playerRepository.hardDeleteByLeagueId(leagueId);
        teamRepository.hardDeleteByLeagueId(leagueId);
    }
}

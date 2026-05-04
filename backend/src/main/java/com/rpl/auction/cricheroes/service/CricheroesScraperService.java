package com.rpl.auction.cricheroes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.rpl.auction.cricheroes.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CricheroesScraperService {

    private static final Pattern TOURNAMENT_URL_PATTERN =
            Pattern.compile("/tournament/(\\d+)/([^/]+)");

    private final CricheroesClient client;

    public ScrapedTournament scrapeTournament(String tournamentUrl) {
        TournamentRef ref = parseTournamentUrl(tournamentUrl);
        JsonNode pp = client.fetchPageProps("/tournament/" + ref.id() + "/" + ref.slug() + "/matches/past-matches");

        JsonNode td = pp.path("tournamentDetails").path("data");
        if (td.isMissingNode()) throw new CricheroesScrapeException("Missing tournamentDetails for " + tournamentUrl);

        Long cricheroesId = td.path("tournament_id").asLong();
        String name = td.path("name").asText();
        String season = extractSeason(name);
        String city = td.path("city_name").asText(null);
        String logo = td.path("tournament_logo").asText(null);

        List<ScrapedMatchSummary> matches = new ArrayList<>();
        for (JsonNode m : pp.path("matchResponse").path("data")) {
            matches.add(parseMatchSummary(m));
        }

        // Fetch teams page separately — past-matches page has empty teamResponse
        JsonNode teamsPp = client.fetchPageProps("/tournament/" + ref.id() + "/" + ref.slug() + "/teams");
        List<Long> teamIds = new ArrayList<>();
        for (JsonNode t : teamsPp.path("teamResponse").path("data")) {
            long tid = t.path("team_id").asLong();
            if (tid > 0) teamIds.add(tid);
        }

        return new ScrapedTournament(cricheroesId, ref.slug(), name, season, city, logo, teamIds, matches);
    }

    public ScrapedTeam scrapeTeam(Long cricheroesTeamId) {
        // Slug not strictly needed — cricheroes URLs accept any slug; use placeholder
        JsonNode pp = client.fetchPageProps("/team-profile/" + cricheroesTeamId + "/team/members");
        JsonNode d = pp.path("members").path("data");
        if (d.isMissingNode() || !d.has("team_id")) {
            throw new CricheroesScrapeException("Missing team data for cricheroes team " + cricheroesTeamId);
        }

        Long teamId = d.path("team_id").asLong();
        String name = d.path("name").asText();
        String shortName = d.path("short_name").asText(null);
        String logo = d.path("team_logo").asText(null);
        Long captainId = d.path("captain_id").isNumber() ? d.path("captain_id").asLong() : null;

        List<ScrapedPlayer> players = new ArrayList<>();
        for (JsonNode p : d.path("members")) {
            Long pid = p.path("player_id").asLong();
            if (pid <= 0) continue;
            String pname = p.path("name").asText();
            String photo = p.path("profile_photo").asText(null);
            String skill = p.path("player_skill").asText(null);
            boolean captain = p.path("is_captain").asInt(0) == 1;
            players.add(new ScrapedPlayer(pid, pname, photo, skill, captain));
        }

        return new ScrapedTeam(teamId, name, shortName, logo, captainId, players);
    }

    public ScrapedScorecard scrapeScorecard(Long cricheroesMatchId, String tournamentSlug, String matchSlug) {
        String tslug = tournamentSlug == null || tournamentSlug.isBlank() ? "tournament" : tournamentSlug;
        String mslug = matchSlug == null || matchSlug.isBlank() ? "match" : matchSlug;
        JsonNode pp = client.fetchPageProps("/scorecard/" + cricheroesMatchId + "/" + tslug + "/" + mslug + "/scorecard");

        JsonNode sd = pp.path("summaryData").path("data");
        if (sd.isMissingNode() || !sd.has("match_id")) {
            throw new CricheroesScrapeException("Missing summaryData for match " + cricheroesMatchId);
        }

        Long matchId = sd.path("match_id").asLong();
        String matchType = sd.path("match_type").asText(null);
        Integer overs = sd.has("overs") && sd.path("overs").isNumber() ? sd.path("overs").asInt() : null;
        String ground = sd.path("ground_name").asText(null);
        String city = sd.path("city_name").asText(null);
        Instant start = parseInstant(sd.path("start_datetime").asText(null));
        String winBy = sd.path("win_by").asText(null);
        String winningTeamName = sd.path("winning_team").asText(null);
        String tournamentName = sd.path("tournament_name").asText(null);
        Long tournamentId = sd.path("tournament_id").isNumber()
                ? sd.path("tournament_id").asLong()
                : (sd.path("tournament_id").isTextual() ? Long.parseLong(sd.path("tournament_id").asText()) : null);

        Long teamAId = sd.path("team_a").path("id").asLong();
        String teamAName = sd.path("team_a").path("name").asText();
        Long teamBId = sd.path("team_b").path("id").asLong();
        String teamBName = sd.path("team_b").path("name").asText();

        Long tossWinnerId = null;
        String tossDecision = null;
        JsonNode toss = sd.path("toss_details");
        if (toss.isObject()) {
            if (toss.has("winning_team_id") && toss.path("winning_team_id").isNumber()) {
                tossWinnerId = toss.path("winning_team_id").asLong();
            }
            tossDecision = toss.path("toss_details").asText(null);
        }

        List<ScrapedInnings> innings = new ArrayList<>();
        for (JsonNode inn : pp.path("scorecard")) {
            innings.add(parseInnings(inn));
        }

        return new ScrapedScorecard(matchId, matchType, overs, ground, city, start, winBy, winningTeamName,
                tournamentName, tournamentId, teamAId, teamAName, teamBId, teamBName,
                tossWinnerId, tossDecision, innings);
    }

    private ScrapedInnings parseInnings(JsonNode inn) {
        JsonNode header = inn.path("inning");
        Integer inningNumber = header.path("inning").asInt();
        Long battingTeamId = header.path("team_id").asLong();
        String battingTeamName = inn.path("teamName").asText(null);
        Integer totalRun = header.path("total_run").asInt(0);
        Integer totalWicket = header.path("total_wicket").asInt(0);
        Integer extras = header.path("total_extra").asInt(0);
        BigDecimal oversPlayed = parseDecimal(header.path("overs_played").asText(null));

        List<ScrapedBatting> batting = new ArrayList<>();
        int pos = 1;
        for (JsonNode b : inn.path("batting")) {
            Long pid = b.path("player_id").asLong();
            if (pid <= 0) continue;
            batting.add(new ScrapedBatting(
                    pid,
                    b.path("name").asText(),
                    pos++,
                    b.path("runs").asInt(0),
                    b.path("balls").asInt(0),
                    b.path("4s").asInt(0),
                    b.path("6s").asInt(0),
                    parseDecimal(b.path("SR").asText(null)),
                    b.path("how_to_out").asText(null)
            ));
        }

        List<ScrapedBowling> bowling = new ArrayList<>();
        for (JsonNode bw : inn.path("bowling")) {
            Long pid = bw.path("player_id").asLong();
            if (pid <= 0) continue;
            bowling.add(new ScrapedBowling(
                    pid,
                    bw.path("name").asText(),
                    parseDecimal(bw.path("overs").asText(null)),
                    bw.path("maidens").asInt(0),
                    bw.path("runs").asInt(0),
                    bw.path("wickets").asInt(0),
                    parseDecimal(bw.path("economy_rate").asText(null))
            ));
        }

        return new ScrapedInnings(inningNumber, battingTeamId, battingTeamName, totalRun, totalWicket,
                oversPlayed, extras, batting, bowling);
    }

    private ScrapedMatchSummary parseMatchSummary(JsonNode m) {
        Long matchId = m.path("match_id").asLong();
        Long teamAId = m.path("team_a_id").asLong();
        String teamAName = m.path("team_a").asText(null);
        Long teamBId = m.path("team_b_id").asLong();
        String teamBName = m.path("team_b").asText(null);
        Long winnerId = m.path("winning_team_id").isNumber() ? m.path("winning_team_id").asLong() : null;
        String winningName = m.path("winning_team").asText(null);
        String winBy = m.path("win_by").asText(null);
        String ground = m.path("ground_name").asText(null);
        Integer overs = m.path("overs").isNumber() ? m.path("overs").asInt() : null;
        String matchType = m.path("match_type").asText(null);
        Instant start = parseInstant(m.path("match_start_time").asText(null));
        String round = m.path("tournament_round_name").asText(null);
        String slug = buildSlug(teamAName, teamBName);
        return new ScrapedMatchSummary(matchId, slug, teamAId, teamAName, teamBId, teamBName,
                winnerId, winningName, winBy, ground, overs, matchType, start, round);
    }

    private String buildSlug(String teamA, String teamB) {
        if (teamA == null || teamB == null) return "match";
        return slugify(teamA) + "-vs-" + slugify(teamB);
    }

    private String slugify(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
    }

    private TournamentRef parseTournamentUrl(String url) {
        URI uri = URI.create(url);
        Matcher m = TOURNAMENT_URL_PATTERN.matcher(uri.getPath());
        if (!m.find()) {
            throw new CricheroesScrapeException("Invalid tournament URL: " + url);
        }
        return new TournamentRef(Long.parseLong(m.group(1)), m.group(2));
    }

    private String extractSeason(String tournamentName) {
        if (tournamentName == null) return null;
        Matcher m = Pattern.compile("(\\d{4})").matcher(tournamentName);
        return m.find() ? m.group(1) : tournamentName;
    }

    private Instant parseInstant(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Instant.parse(s);
        } catch (Exception e) {
            try {
                return Instant.from(DateTimeFormatter.ISO_DATE_TIME.parse(s));
            } catch (Exception ignored) {
                log.debug("Could not parse instant: {}", s);
                return null;
            }
        }
    }

    private BigDecimal parseDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record TournamentRef(long id, String slug) {}
}

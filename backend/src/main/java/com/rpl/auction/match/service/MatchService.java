package com.rpl.auction.match.service;

import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.match.dto.BattingRow;
import com.rpl.auction.match.dto.BowlingRow;
import com.rpl.auction.match.dto.InningsResponse;
import com.rpl.auction.match.dto.MatchDetailResponse;
import com.rpl.auction.match.dto.MatchResponse;
import com.rpl.auction.match.entity.Innings;
import com.rpl.auction.match.entity.Match;
import com.rpl.auction.match.repository.BattingPerformanceRepository;
import com.rpl.auction.match.repository.BowlingPerformanceRepository;
import com.rpl.auction.match.repository.InningsRepository;
import com.rpl.auction.match.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;
    private final BattingPerformanceRepository battingPerformanceRepository;
    private final BowlingPerformanceRepository bowlingPerformanceRepository;

    @Transactional(readOnly = true)
    public List<MatchResponse> findByLeague(Long leagueId, Match.MatchStatus status) {
        List<Match> matches = (status == null)
                ? matchRepository.findByLeagueIdOrderByScheduledAtAsc(leagueId)
                : matchRepository.findByLeagueIdAndStatusOrderByScheduledAtAsc(leagueId, status);

        if (matches.isEmpty()) return List.of();

        List<Long> matchIds = matches.stream().map(Match::getId).toList();
        List<Innings> allInnings = inningsRepository.findAll().stream()
                .filter(i -> matchIds.contains(i.getMatch().getId()))
                .toList();
        Map<Long, List<Innings>> byMatch = allInnings.stream()
                .collect(Collectors.groupingBy(i -> i.getMatch().getId()));

        return matches.stream()
                .map(m -> MatchResponse.from(m, byMatch.getOrDefault(m.getId(), Collections.emptyList())))
                .toList();
    }

    @Transactional(readOnly = true)
    public MatchDetailResponse getDetail(Long matchId) {
        Match m = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        List<Innings> innings = inningsRepository.findByMatchIdOrderByInningsNumberAsc(m.getId());

        List<InningsResponse> inningsDtos = innings.stream().map(i -> {
            List<BattingRow> batting = battingPerformanceRepository.findByInningsIdOrderByPositionAsc(i.getId())
                    .stream().map(BattingRow::from).toList();
            List<BowlingRow> bowling = bowlingPerformanceRepository.findByInningsId(i.getId())
                    .stream()
                    .sorted(Comparator.comparing((com.rpl.auction.match.entity.BowlingPerformance bp) -> bp.getOvers() == null ? java.math.BigDecimal.ZERO : bp.getOvers()).reversed())
                    .map(BowlingRow::from).toList();
            return InningsResponse.from(i, batting, bowling);
        }).toList();

        return MatchDetailResponse.builder()
                .id(m.getId())
                .cricheroesId(m.getCricheroesId())
                .leagueId(m.getLeague().getId())
                .leagueName(m.getLeague().getName())
                .status(m.getStatus().name())
                .venue(m.getVenue())
                .format(m.getFormat())
                .overs(m.getOvers())
                .scheduledAt(m.getScheduledAt())
                .resultText(m.getResultText())
                .teamAId(m.getTeamA().getId())
                .teamAName(m.getTeamA().getName())
                .teamAShortName(m.getTeamA().getShortName())
                .teamALogoUrl(m.getTeamA().getLogoUrl())
                .teamBId(m.getTeamB().getId())
                .teamBName(m.getTeamB().getName())
                .teamBShortName(m.getTeamB().getShortName())
                .teamBLogoUrl(m.getTeamB().getLogoUrl())
                .winnerTeamId(m.getWinnerTeam() != null ? m.getWinnerTeam().getId() : null)
                .winnerTeamName(m.getWinnerTeam() != null ? m.getWinnerTeam().getName() : null)
                .innings(inningsDtos)
                .build();
    }
}

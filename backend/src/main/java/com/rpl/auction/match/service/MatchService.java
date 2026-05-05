package com.rpl.auction.match.service;

import com.rpl.auction.match.dto.MatchResponse;
import com.rpl.auction.match.entity.Innings;
import com.rpl.auction.match.entity.Match;
import com.rpl.auction.match.repository.InningsRepository;
import com.rpl.auction.match.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;

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
}

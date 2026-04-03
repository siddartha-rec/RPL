package com.rpl.auction.history.service;

import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.history.dto.PlayerHistoryResponse;
import com.rpl.auction.history.dto.TeamStandingRequest;
import com.rpl.auction.history.dto.TeamStandingResponse;
import com.rpl.auction.history.entity.PlayerHistory;
import com.rpl.auction.history.entity.TeamStanding;
import com.rpl.auction.history.repository.PlayerHistoryRepository;
import com.rpl.auction.history.repository.TeamStandingRepository;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HistoryService {

    private final PlayerHistoryRepository playerHistoryRepository;
    private final TeamStandingRepository teamStandingRepository;
    private final LeagueRepository leagueRepository;
    private final TeamRepository teamRepository;

    @Transactional(readOnly = true)
    public List<PlayerHistoryResponse> getPlayerHistory(Long playerId) {
        List<PlayerHistory> histories = playerHistoryRepository.findByPlayerIdOrderByCreatedAtDesc(playerId);
        return histories.stream().map(h -> {
            String leagueName = leagueRepository.findById(h.getLeagueId())
                    .map(League::getName)
                    .orElse(null);
            String teamName = teamRepository.findById(h.getTeamId())
                    .map(Team::getName)
                    .orElse(null);
            return PlayerHistoryResponse.from(h, leagueName, teamName);
        }).toList();
    }

    @Transactional
    public TeamStandingResponse createStanding(Long leagueId, TeamStandingRequest request) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League not found with id: " + leagueId));
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + request.getTeamId()));
        TeamStanding standing = TeamStanding.builder()
                .leagueId(leagueId)
                .teamId(request.getTeamId())
                .rank(request.getRank())
                .points(request.getPoints())
                .notes(request.getNotes())
                .build();
        TeamStanding saved = teamStandingRepository.save(standing);
        return TeamStandingResponse.from(saved, league.getName(), team.getName());
    }

    @Transactional(readOnly = true)
    public List<TeamStandingResponse> getStandings(Long leagueId) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League not found with id: " + leagueId));
        List<TeamStanding> standings = teamStandingRepository.findByLeagueIdOrderByRankAsc(leagueId);
        return standings.stream().map(s -> {
            String teamName = teamRepository.findById(s.getTeamId())
                    .map(Team::getName)
                    .orElse(null);
            return TeamStandingResponse.from(s, league.getName(), teamName);
        }).toList();
    }
}

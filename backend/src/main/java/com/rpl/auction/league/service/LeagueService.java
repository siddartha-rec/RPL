package com.rpl.auction.league.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.dto.LeagueRequest;
import com.rpl.auction.league.dto.LeagueResponse;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeagueService {

    private final LeagueRepository leagueRepository;

    @Transactional
    public LeagueResponse create(LeagueRequest request) {
        if (leagueRepository.existsBySeason(request.getSeason())) {
            throw new BadRequestException("A league for season '" + request.getSeason() + "' already exists");
        }
        League league = League.builder()
                .name(request.getName())
                .season(request.getSeason())
                .teamBudget(request.getTeamBudget())
                .maxPlayersPerTeam(request.getMaxPlayersPerTeam())
                .minPlayersPerTeam(request.getMinPlayersPerTeam() != null ? request.getMinPlayersPerTeam() : 15)
                .minWomenPerTeam(request.getMinWomenPerTeam() != null ? request.getMinWomenPerTeam() : 2)
                .maxRetentionsPerTeam(request.getMaxRetentionsPerTeam())
                .retentionCost(request.getRetentionCost())
                .bidIncrement(request.getBidIncrement())
                .timerSeconds(request.getTimerSeconds())
                .build();
        return LeagueResponse.from(leagueRepository.save(league));
    }

    @Transactional(readOnly = true)
    public List<LeagueResponse> findAll() {
        return leagueRepository.findAll().stream()
                .map(LeagueResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public LeagueResponse findById(Long id) {
        return LeagueResponse.from(getLeagueOrThrow(id));
    }

    @Transactional
    public LeagueResponse update(Long id, LeagueRequest request) {
        League league = getLeagueOrThrow(id);
        if (!league.getSeason().equals(request.getSeason()) && leagueRepository.existsBySeason(request.getSeason())) {
            throw new BadRequestException("A league for season '" + request.getSeason() + "' already exists");
        }
        league.setName(request.getName());
        league.setSeason(request.getSeason());
        league.setTeamBudget(request.getTeamBudget());
        league.setMaxPlayersPerTeam(request.getMaxPlayersPerTeam());
        if (request.getMinPlayersPerTeam() != null) {
            league.setMinPlayersPerTeam(request.getMinPlayersPerTeam());
        }
        if (request.getMinWomenPerTeam() != null) {
            league.setMinWomenPerTeam(request.getMinWomenPerTeam());
        }
        league.setMaxRetentionsPerTeam(request.getMaxRetentionsPerTeam());
        league.setRetentionCost(request.getRetentionCost());
        league.setBidIncrement(request.getBidIncrement());
        league.setTimerSeconds(request.getTimerSeconds());
        return LeagueResponse.from(leagueRepository.save(league));
    }

    @Transactional
    public void delete(Long id) {
        getLeagueOrThrow(id);
        leagueRepository.deleteById(id);
    }

    public League getLeagueOrThrow(Long id) {
        return leagueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("League not found with id: " + id));
    }
}

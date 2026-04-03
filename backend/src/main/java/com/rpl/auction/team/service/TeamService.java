package com.rpl.auction.team.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.service.LeagueService;
import com.rpl.auction.team.dto.TeamRequest;
import com.rpl.auction.team.dto.TeamResponse;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import com.rpl.auction.user.entity.User;
import com.rpl.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final LeagueService leagueService;
    private final UserRepository userRepository;

    @Transactional
    public TeamResponse create(Long leagueId, TeamRequest request) {
        if (teamRepository.existsByNameAndLeagueId(request.getName(), leagueId)) {
            throw new BadRequestException("A team with name '" + request.getName() + "' already exists in this league");
        }
        League league = leagueService.getLeagueOrThrow(leagueId);
        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getOwnerId()));
        Team team = Team.builder()
                .name(request.getName())
                .shortName(request.getShortName())
                .color(request.getColor())
                .logoUrl(request.getLogoUrl())
                .owner(owner)
                .league(league)
                .budget(league.getTeamBudget())
                .build();
        return TeamResponse.from(teamRepository.save(team));
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> findByLeague(Long leagueId) {
        return teamRepository.findByLeagueId(leagueId).stream()
                .map(TeamResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamResponse findById(Long id) {
        return TeamResponse.from(getTeamOrThrow(id));
    }

    @Transactional
    public TeamResponse update(Long id, TeamRequest request) {
        Team team = getTeamOrThrow(id);
        if (!team.getName().equals(request.getName()) &&
                teamRepository.existsByNameAndLeagueId(request.getName(), team.getLeague().getId())) {
            throw new BadRequestException("A team with name '" + request.getName() + "' already exists in this league");
        }
        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getOwnerId()));
        team.setName(request.getName());
        team.setShortName(request.getShortName());
        team.setColor(request.getColor());
        team.setLogoUrl(request.getLogoUrl());
        team.setOwner(owner);
        return TeamResponse.from(teamRepository.save(team));
    }

    @Transactional
    public void delete(Long id) {
        getTeamOrThrow(id);
        teamRepository.deleteById(id);
    }

    public Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + id));
    }
}

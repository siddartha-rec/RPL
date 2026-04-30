package com.rpl.auction.player.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.service.LeagueService;
import com.rpl.auction.player.dto.PlayerImportRequest;
import com.rpl.auction.player.dto.PlayerPageResponse;
import com.rpl.auction.player.dto.PlayerRequest;
import com.rpl.auction.player.dto.PlayerResponse;
import com.rpl.auction.player.entity.Player;
import com.rpl.auction.player.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final LeagueService leagueService;

    @Transactional
    public PlayerResponse create(Long leagueId, PlayerRequest request) {
        League league = leagueService.getLeagueOrThrow(leagueId);
        Player player = buildPlayer(request, league);
        return PlayerResponse.from(playerRepository.save(player));
    }

    @Transactional
    public List<PlayerResponse> importPlayers(Long leagueId, PlayerImportRequest request) {
        League league = leagueService.getLeagueOrThrow(leagueId);
        List<Player> players = request.getPlayers().stream()
                .map(pr -> buildPlayer(pr, league))
                .toList();
        return playerRepository.saveAll(players).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PlayerResponse> findByLeague(Long leagueId, String category, String status, Long teamId) {
        leagueService.getLeagueOrThrow(leagueId);
        List<Player> players;
        if (category != null && !category.isBlank()) {
            Player.PlayerCategory cat = parseCategory(category);
            players = playerRepository.findByLeagueIdAndCategory(leagueId, cat);
        } else if (status != null && !status.isBlank()) {
            Player.PlayerStatus st = parseStatus(status);
            players = playerRepository.findByLeagueIdAndStatus(leagueId, st);
        } else if (teamId != null) {
            players = playerRepository.findByLeagueIdAndTeamId(leagueId, teamId);
        } else {
            players = playerRepository.findByLeagueId(leagueId);
        }
        return players.stream().map(PlayerResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PlayerPageResponse findByLeaguePaginated(Long leagueId, String category, String status, Long teamId, String search, int page, int size) {
        leagueService.getLeagueOrThrow(leagueId);

        Player.PlayerCategory cat = (category != null && !category.isBlank()) ? parseCategory(category) : null;
        Player.PlayerStatus st = (status != null && !status.isBlank()) ? parseStatus(status) : null;
        String searchParam = (search != null && !search.isBlank()) ? search : null;

        Pageable pageable = PageRequest.of(page, size, Sort.by("playerNumber").ascending().and(Sort.by("name").ascending()));
        Page<Player> playerPage = playerRepository.findFiltered(leagueId, cat, st, teamId, searchParam, pageable);

        return PlayerPageResponse.builder()
                .content(playerPage.getContent().stream().map(PlayerResponse::from).toList())
                .page(playerPage.getNumber())
                .size(playerPage.getSize())
                .totalElements(playerPage.getTotalElements())
                .totalPages(playerPage.getTotalPages())
                .first(playerPage.isFirst())
                .last(playerPage.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public PlayerResponse findById(Long id) {
        return PlayerResponse.from(getPlayerOrThrow(id));
    }

    @Transactional
    public PlayerResponse update(Long id, PlayerRequest request) {
        Player player = getPlayerOrThrow(id);
        player.setName(request.getName());
        player.setPlayerNumber(request.getPlayerNumber());
        player.setCategory(parseCategory(request.getCategory()));
        player.setRole(request.getRole());
        player.setGender(parseGender(request.getGender()));
        if (request.getBasePrice() != null) {
            player.setBasePrice(request.getBasePrice());
        }
        if (request.getIsCaptain() != null) {
            player.setIsCaptain(request.getIsCaptain());
        }
        return PlayerResponse.from(playerRepository.save(player));
    }

    @Transactional
    public void delete(Long id) {
        getPlayerOrThrow(id);
        playerRepository.deleteById(id);
    }

    public Player getPlayerOrThrow(Long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found with id: " + id));
    }

    private Player buildPlayer(PlayerRequest request, League league) {
        return Player.builder()
                .name(request.getName())
                .playerNumber(request.getPlayerNumber())
                .category(parseCategory(request.getCategory()))
                .role(request.getRole())
                .gender(parseGender(request.getGender()))
                .basePrice(request.getBasePrice() != null ? request.getBasePrice() : java.math.BigDecimal.ZERO)
                .isCaptain(request.getIsCaptain() != null ? request.getIsCaptain() : false)
                .league(league)
                .build();
    }

    private Player.Gender parseGender(String gender) {
        if (gender == null || gender.isBlank()) return null;
        try {
            return Player.Gender.valueOf(gender.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid gender: " + gender + " (allowed: MALE, FEMALE, OTHER)");
        }
    }

    private Player.PlayerCategory parseCategory(String category) {
        try {
            return Player.PlayerCategory.valueOf(category.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid player category: " + category);
        }
    }

    private Player.PlayerStatus parseStatus(String status) {
        try {
            return Player.PlayerStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid player status: " + status);
        }
    }
}

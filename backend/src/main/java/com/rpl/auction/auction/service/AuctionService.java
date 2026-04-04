package com.rpl.auction.auction.service;

import com.rpl.auction.auction.dto.*;
import com.rpl.auction.auction.entity.Auction;
import com.rpl.auction.auction.entity.Bid;
import com.rpl.auction.auction.entity.DraftPick;
import com.rpl.auction.auction.repository.AuctionRepository;
import com.rpl.auction.auction.repository.BidRepository;
import com.rpl.auction.auction.repository.DraftPickRepository;
import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.history.entity.PlayerHistory;
import com.rpl.auction.history.repository.PlayerHistoryRepository;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.player.entity.Player;
import com.rpl.auction.player.repository.PlayerRepository;
import com.rpl.auction.team.entity.Team;
import com.rpl.auction.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final DraftPickRepository draftPickRepository;
    private final LeagueRepository leagueRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final PlayerHistoryRepository playerHistoryRepository;
    private final SseService sseService;

    @Transactional
    public AuctionResponse create(Long leagueId) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League", leagueId));

        if (auctionRepository.existsByLeagueId(leagueId)) {
            throw new BadRequestException("An auction already exists for league " + leagueId);
        }

        Auction auction = Auction.builder()
                .leagueId(leagueId)
                .timerSeconds(league.getTimerSeconds())
                .build();

        auction = auctionRepository.save(auction);
        log.info("Created auction {} for league {}", auction.getId(), leagueId);
        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    public AuctionResponse getAuction(Long id) {
        Auction auction = getAuctionOrThrow(id);
        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse start(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != Auction.AuctionStatus.NOT_STARTED) {
            throw new BadRequestException("Auction must be in NOT_STARTED status to start. Current: " + auction.getStatus());
        }

        List<Team> teams = teamRepository.findByLeagueId(auction.getLeagueId());
        if (teams.isEmpty()) {
            throw new BadRequestException("No teams found for this league");
        }

        auction.setStatus(Auction.AuctionStatus.RETENTION);
        auction.setCurrentPickTeamId(teams.get(0).getId());
        auction = auctionRepository.save(auction);

        broadcastEvent(auction.getId(), "AUCTION_STARTED", Map.of(
                "auctionId", auction.getId(),
                "status", auction.getStatus().name()
        ));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse advanceToLive(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != Auction.AuctionStatus.RETENTION) {
            throw new BadRequestException("Auction must be in RETENTION status to advance to LIVE. Current: " + auction.getStatus());
        }

        auction.setStatus(Auction.AuctionStatus.LIVE);
        auction.setCurrentPickTeamId(null);
        auction = auctionRepository.save(auction);

        broadcastEvent(auction.getId(), "AUCTION_LIVE", Map.of(
                "auctionId", auction.getId(),
                "status", auction.getStatus().name()
        ));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse putUpPlayer(Long auctionId, Long playerId) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != Auction.AuctionStatus.LIVE) {
            throw new BadRequestException("Auction must be LIVE to put up a player. Current: " + auction.getStatus());
        }

        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));

        if (player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new BadRequestException("Player " + playerId + " is not AVAILABLE. Current: " + player.getStatus());
        }

        if (!player.getLeague().getId().equals(auction.getLeagueId())) {
            throw new BadRequestException("Player does not belong to this auction's league");
        }

        final Long leagueIdForPlayer = auction.getLeagueId();
        League league = leagueRepository.findById(leagueIdForPlayer)
                .orElseThrow(() -> new ResourceNotFoundException("League", leagueIdForPlayer));

        auction.setCurrentPlayerId(playerId);
        auction.setCurrentBasePrice(player.getBasePrice());
        auction.setCurrentHighestBidId(null);
        auction.setTimerSeconds(league.getTimerSeconds());
        auction = auctionRepository.save(auction);

        broadcastEvent(auction.getId(), "PLAYER_UP", Map.of(
                "playerId", playerId,
                "playerName", player.getName(),
                "basePrice", player.getBasePrice()
        ));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public BidResponse placeBid(Long auctionId, BidRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != Auction.AuctionStatus.LIVE) {
            throw new BadRequestException("Auction must be LIVE to place a bid. Current: " + auction.getStatus());
        }

        if (auction.getCurrentPlayerId() == null) {
            throw new BadRequestException("No player is currently up for bidding");
        }

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team", request.getTeamId()));

        League league = leagueRepository.findById(auction.getLeagueId())
                .orElseThrow(() -> new ResourceNotFoundException("League", auction.getLeagueId()));

        // Calculate bid amount
        BigDecimal bidAmount;
        long bidCount = bidRepository.countByAuctionIdAndPlayerId(auctionId, auction.getCurrentPlayerId());
        if (bidCount == 0) {
            bidAmount = auction.getCurrentBasePrice();
        } else {
            // Get current highest bid and add increment
            Bid currentHighestBid = bidRepository.findById(auction.getCurrentHighestBidId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bid", auction.getCurrentHighestBidId()));
            bidAmount = currentHighestBid.getAmount().add(league.getBidIncrement());

            // Cannot bid for own player
            if (currentHighestBid.getTeamId().equals(request.getTeamId())) {
                throw new BadRequestException("Team already has the highest bid");
            }
        }

        // Validate budget
        BigDecimal availableBudget = team.getBudget().subtract(team.getBudgetSpent());
        if (bidAmount.compareTo(availableBudget) > 0) {
            throw new BadRequestException("Insufficient budget. Required: " + bidAmount + ", Available: " + availableBudget);
        }

        // Mark previous bids as not winning
        if (auction.getCurrentHighestBidId() != null) {
            bidRepository.findById(auction.getCurrentHighestBidId()).ifPresent(prevBid -> {
                prevBid.setIsWinning(false);
                bidRepository.save(prevBid);
            });
        }

        int nextBidOrder = (int) bidCount + 1;
        Bid bid = Bid.builder()
                .auctionId(auctionId)
                .playerId(auction.getCurrentPlayerId())
                .teamId(request.getTeamId())
                .amount(bidAmount)
                .bidOrder(nextBidOrder)
                .isWinning(true)
                .build();
        bid = bidRepository.save(bid);

        auction.setCurrentHighestBidId(bid.getId());
        auction.setTimerSeconds(league.getTimerSeconds());
        auctionRepository.save(auction);

        broadcastEvent(auctionId, "BID_PLACED", Map.of(
                "bidId", bid.getId(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "amount", bidAmount,
                "playerId", auction.getCurrentPlayerId()
        ));

        return BidResponse.from(bid, team.getName());
    }

    @Transactional
    public AuctionResponse soldPlayer(Long auctionId) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != Auction.AuctionStatus.LIVE) {
            throw new BadRequestException("Auction must be LIVE to sell a player. Current: " + auction.getStatus());
        }

        if (auction.getCurrentPlayerId() == null) {
            throw new BadRequestException("No player is currently up for sale");
        }

        Long playerId = auction.getCurrentPlayerId();
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));

        final Long highestBidId = auction.getCurrentHighestBidId();
        if (highestBidId != null) {
            // Player sold to highest bidder
            Bid winningBid = bidRepository.findById(highestBidId)
                    .orElseThrow(() -> new ResourceNotFoundException("Bid", highestBidId));

            Team winningTeam = teamRepository.findById(winningBid.getTeamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Team", winningBid.getTeamId()));

            player.setStatus(Player.PlayerStatus.SOLD);
            player.setSoldPrice(winningBid.getAmount());
            playerRepository.save(player);

            winningTeam.setBudgetSpent(winningTeam.getBudgetSpent().add(winningBid.getAmount()));
            teamRepository.save(winningTeam);

            PlayerHistory history = PlayerHistory.builder()
                    .playerId(playerId)
                    .leagueId(auction.getLeagueId())
                    .teamId(winningTeam.getId())
                    .acquisitionType(PlayerHistory.AcquisitionType.AUCTIONED)
                    .soldPrice(winningBid.getAmount())
                    .build();
            playerHistoryRepository.save(history);

            broadcastEvent(auctionId, "PLAYER_SOLD", Map.of(
                    "playerId", playerId,
                    "playerName", player.getName(),
                    "teamId", winningTeam.getId(),
                    "teamName", winningTeam.getName(),
                    "amount", winningBid.getAmount()
            ));

            broadcastBudgetUpdate(auctionId, winningTeam);
        } else {
            // No bids — player unsold
            player.setStatus(Player.PlayerStatus.UNSOLD);
            playerRepository.save(player);

            broadcastEvent(auctionId, "PLAYER_UNSOLD", Map.of(
                    "playerId", playerId,
                    "playerName", player.getName()
            ));
        }

        auction.setCurrentPlayerId(null);
        auction.setCurrentBasePrice(null);
        auction.setCurrentHighestBidId(null);
        auction = auctionRepository.save(auction);

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse pause(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != Auction.AuctionStatus.LIVE) {
            throw new BadRequestException("Auction must be LIVE to pause. Current: " + auction.getStatus());
        }

        auction.setStatus(Auction.AuctionStatus.PAUSED);
        auction = auctionRepository.save(auction);

        broadcastEvent(id, "AUCTION_PAUSED", Map.of("auctionId", id));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse resume(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != Auction.AuctionStatus.PAUSED) {
            throw new BadRequestException("Auction must be PAUSED to resume. Current: " + auction.getStatus());
        }

        auction.setStatus(Auction.AuctionStatus.LIVE);
        auction = auctionRepository.save(auction);

        broadcastEvent(id, "AUCTION_RESUMED", Map.of("auctionId", id));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse switchToDraft(Long id) {
        Auction auction = getAuctionOrThrow(id);
        if (auction.getStatus() != Auction.AuctionStatus.LIVE && auction.getStatus() != Auction.AuctionStatus.PAUSED) {
            throw new BadRequestException("Auction must be LIVE or PAUSED to switch to DRAFT. Current: " + auction.getStatus());
        }

        List<Team> teams = teamRepository.findByLeagueId(auction.getLeagueId());
        // Sort teams by budget spent ascending for draft pick order
        teams.sort(Comparator.comparing(Team::getBudgetSpent));

        if (!teams.isEmpty()) {
            auction.setCurrentPickTeamId(teams.get(0).getId());
        }

        auction.setStatus(Auction.AuctionStatus.DRAFT);
        auction.setCurrentPlayerId(null);
        auction.setCurrentBasePrice(null);
        auction.setCurrentHighestBidId(null);
        auction = auctionRepository.save(auction);

        broadcastEvent(id, "DRAFT_STARTED", Map.of("auctionId", id, "status", "DRAFT"));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse makeRetentionPick(Long auctionId, PickRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != Auction.AuctionStatus.RETENTION) {
            throw new BadRequestException("Auction must be in RETENTION status. Current: " + auction.getStatus());
        }

        if (auction.getCurrentPickTeamId() == null) {
            throw new BadRequestException("No team is currently picking");
        }

        final Long retentionLeagueId = auction.getLeagueId();
        final Long retentionPickTeamId = auction.getCurrentPickTeamId();
        League league = leagueRepository.findById(retentionLeagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League", retentionLeagueId));

        Team team = teamRepository.findById(retentionPickTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", retentionPickTeamId));

        // Check retention limit
        long retentionCount = draftPickRepository.countByAuctionIdAndTeamIdAndPickType(
                auctionId, team.getId(), DraftPick.PickType.RETENTION);
        if (retentionCount >= league.getMaxRetentionsPerTeam()) {
            throw new BadRequestException("Team has reached the maximum number of retentions: " + league.getMaxRetentionsPerTeam());
        }

        Player player = playerRepository.findById(request.getPlayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", request.getPlayerId()));

        if (player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new BadRequestException("Player " + request.getPlayerId() + " is not AVAILABLE. Current: " + player.getStatus());
        }

        // Check budget
        BigDecimal retentionCost = league.getRetentionCost();
        BigDecimal availableBudget = team.getBudget().subtract(team.getBudgetSpent());
        if (retentionCost.compareTo(availableBudget) > 0) {
            throw new BadRequestException("Insufficient budget for retention. Cost: " + retentionCost + ", Available: " + availableBudget);
        }

        // Calculate pick order
        long totalPicks = draftPickRepository.findByAuctionIdOrderByPickOrderAsc(auctionId).size();
        int pickOrder = (int) totalPicks + 1;
        int roundNumber = (int) (retentionCount + 1);

        DraftPick pick = DraftPick.builder()
                .auctionId(auctionId)
                .playerId(request.getPlayerId())
                .teamId(team.getId())
                .roundNumber(roundNumber)
                .pickOrder(pickOrder)
                .pickType(DraftPick.PickType.RETENTION)
                .cost(retentionCost)
                .build();
        draftPickRepository.save(pick);

        // Update player status
        player.setStatus(Player.PlayerStatus.RETAINED);
        player.setSoldPrice(league.getRetentionCost());
        playerRepository.save(player);

        // Deduct budget
        team.setBudgetSpent(team.getBudgetSpent().add(retentionCost));
        teamRepository.save(team);

        // Create history
        PlayerHistory history = PlayerHistory.builder()
                .playerId(request.getPlayerId())
                .leagueId(auction.getLeagueId())
                .teamId(team.getId())
                .acquisitionType(PlayerHistory.AcquisitionType.RETAINED)
                .soldPrice(retentionCost)
                .build();
        playerHistoryRepository.save(history);

        broadcastEvent(auctionId, "PLAYER_RETAINED", Map.of(
                "playerId", request.getPlayerId(),
                "playerName", player.getName(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "cost", retentionCost
        ));
        broadcastBudgetUpdate(auctionId, team);

        // Advance to next team
        advancePickTeam(auction);
        auction = auctionRepository.save(auction);

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse makeDraftPick(Long auctionId, PickRequest request) {
        Auction auction = getAuctionOrThrow(auctionId);
        if (auction.getStatus() != Auction.AuctionStatus.DRAFT) {
            throw new BadRequestException("Auction must be in DRAFT status. Current: " + auction.getStatus());
        }

        if (auction.getCurrentPickTeamId() == null) {
            throw new BadRequestException("No team is currently picking");
        }

        final Long draftLeagueId = auction.getLeagueId();
        final Long draftPickTeamId = auction.getCurrentPickTeamId();
        League league = leagueRepository.findById(draftLeagueId)
                .orElseThrow(() -> new ResourceNotFoundException("League", draftLeagueId));

        Team team = teamRepository.findById(draftPickTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", draftPickTeamId));

        Player player = playerRepository.findById(request.getPlayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", request.getPlayerId()));

        if (player.getStatus() != Player.PlayerStatus.AVAILABLE && player.getStatus() != Player.PlayerStatus.UNSOLD) {
            throw new BadRequestException("Player must be AVAILABLE or UNSOLD for draft. Current: " + player.getStatus());
        }

        if (!player.getLeague().getId().equals(auction.getLeagueId())) {
            throw new BadRequestException("Player does not belong to this auction's league");
        }

        BigDecimal draftCost = league.getBidIncrement();
        BigDecimal availableBudget = team.getBudget().subtract(team.getBudgetSpent());
        if (draftCost.compareTo(availableBudget) > 0) {
            throw new BadRequestException("Insufficient budget for draft pick. Cost: " + draftCost + ", Available: " + availableBudget);
        }

        long existingPicks = draftPickRepository.findByAuctionIdAndPickType(auctionId, DraftPick.PickType.DRAFT).size();
        long teamDraftPicks = draftPickRepository.countByAuctionIdAndTeamIdAndPickType(auctionId, team.getId(), DraftPick.PickType.DRAFT);
        long totalPicks = draftPickRepository.findByAuctionIdOrderByPickOrderAsc(auctionId).size();

        DraftPick pick = DraftPick.builder()
                .auctionId(auctionId)
                .playerId(request.getPlayerId())
                .teamId(team.getId())
                .roundNumber((int) (teamDraftPicks + 1))
                .pickOrder((int) totalPicks + 1)
                .pickType(DraftPick.PickType.DRAFT)
                .cost(draftCost)
                .build();
        draftPickRepository.save(pick);

        player.setStatus(Player.PlayerStatus.SOLD);
        player.setSoldPrice(draftCost);
        playerRepository.save(player);

        team.setBudgetSpent(team.getBudgetSpent().add(draftCost));
        teamRepository.save(team);

        PlayerHistory history = PlayerHistory.builder()
                .playerId(request.getPlayerId())
                .leagueId(auction.getLeagueId())
                .teamId(team.getId())
                .acquisitionType(PlayerHistory.AcquisitionType.DRAFTED)
                .soldPrice(draftCost)
                .build();
        playerHistoryRepository.save(history);

        broadcastEvent(auctionId, "PLAYER_DRAFTED", Map.of(
                "playerId", request.getPlayerId(),
                "playerName", player.getName(),
                "teamId", team.getId(),
                "teamName", team.getName(),
                "cost", draftCost
        ));
        broadcastBudgetUpdate(auctionId, team);

        advancePickTeam(auction);
        auction = auctionRepository.save(auction);

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    @Transactional
    public AuctionResponse complete(Long id) {
        Auction auction = getAuctionOrThrow(id);
        auction.setStatus(Auction.AuctionStatus.COMPLETED);
        auction = auctionRepository.save(auction);

        broadcastEvent(id, "AUCTION_COMPLETED", Map.of("auctionId", id));

        return enrichAuctionResponse(AuctionResponse.from(auction), auction);
    }

    public SseEmitter subscribe(Long auctionId) {
        getAuctionOrThrow(auctionId); // validate exists
        return sseService.subscribe(auctionId);
    }

    // ---- Private helpers ----

    private Auction getAuctionOrThrow(Long id) {
        return auctionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction", id));
    }

    private void advancePickTeam(Auction auction) {
        List<Team> teams = teamRepository.findByLeagueId(auction.getLeagueId());
        if (teams.isEmpty()) {
            auction.setCurrentPickTeamId(null);
            return;
        }

        if (auction.getStatus() == Auction.AuctionStatus.DRAFT) {
            // Sort by budget spent ascending for draft
            teams.sort(Comparator.comparing(Team::getBudgetSpent));
        }

        Long currentTeamId = auction.getCurrentPickTeamId();
        int currentIndex = -1;
        for (int i = 0; i < teams.size(); i++) {
            if (teams.get(i).getId().equals(currentTeamId)) {
                currentIndex = i;
                break;
            }
        }

        int nextIndex = (currentIndex + 1) % teams.size();
        auction.setCurrentPickTeamId(teams.get(nextIndex).getId());
    }

    private AuctionResponse enrichAuctionResponse(AuctionResponse response, Auction auction) {
        // Enrich player name
        if (auction.getCurrentPlayerId() != null) {
            playerRepository.findById(auction.getCurrentPlayerId())
                    .ifPresent(p -> response.setCurrentPlayerName(p.getName()));
        }

        // Enrich highest bid info
        if (auction.getCurrentHighestBidId() != null) {
            bidRepository.findById(auction.getCurrentHighestBidId()).ifPresent(bid -> {
                response.setCurrentHighestBid(bid.getAmount());
                teamRepository.findById(bid.getTeamId())
                        .ifPresent(t -> response.setCurrentHighestBidTeam(t.getName()));
            });
        }

        // Enrich pick team name
        if (auction.getCurrentPickTeamId() != null) {
            teamRepository.findById(auction.getCurrentPickTeamId())
                    .ifPresent(t -> response.setCurrentPickTeamName(t.getName()));
        }

        return response;
    }

    private void broadcastEvent(Long auctionId, String type, Map<String, Object> data) {
        AuctionEvent event = AuctionEvent.builder()
                .type(type)
                .data(data)
                .build();
        sseService.broadcast(auctionId, event);
    }

    private void broadcastBudgetUpdate(Long auctionId, Team team) {
        broadcastEvent(auctionId, "BUDGET_UPDATE", Map.of(
                "teamId", team.getId(),
                "teamName", team.getName(),
                "budgetSpent", team.getBudgetSpent(),
                "budgetRemaining", team.getBudget().subtract(team.getBudgetSpent())
        ));
    }
}

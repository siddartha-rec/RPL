package com.rpl.auction.history.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.history.dto.PlayerHistoryResponse;
import com.rpl.auction.history.dto.TeamStandingRequest;
import com.rpl.auction.history.dto.TeamStandingResponse;
import com.rpl.auction.history.service.HistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryService historyService;

    @GetMapping("/api/players/{playerId}/history")
    public ResponseEntity<ApiResponse<List<PlayerHistoryResponse>>> getPlayerHistory(
            @PathVariable Long playerId) {
        List<PlayerHistoryResponse> history = historyService.getPlayerHistory(playerId);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @PostMapping("/api/leagues/{leagueId}/standings")
    public ResponseEntity<ApiResponse<TeamStandingResponse>> createStanding(
            @PathVariable Long leagueId,
            @Valid @RequestBody TeamStandingRequest request) {
        TeamStandingResponse response = historyService.createStanding(leagueId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Standing created successfully"));
    }

    @GetMapping("/api/leagues/{leagueId}/standings")
    public ResponseEntity<ApiResponse<List<TeamStandingResponse>>> getStandings(
            @PathVariable Long leagueId) {
        List<TeamStandingResponse> standings = historyService.getStandings(leagueId);
        return ResponseEntity.ok(ApiResponse.success(standings));
    }
}

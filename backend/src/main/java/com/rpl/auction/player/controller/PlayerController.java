package com.rpl.auction.player.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.player.dto.PlayerImportRequest;
import com.rpl.auction.player.dto.PlayerPageResponse;
import com.rpl.auction.player.dto.PlayerRequest;
import com.rpl.auction.player.dto.PlayerResponse;
import com.rpl.auction.player.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    @PostMapping("/api/leagues/{leagueId}/players")
    public ResponseEntity<ApiResponse<PlayerResponse>> create(
            @PathVariable Long leagueId,
            @Valid @RequestBody PlayerRequest request) {
        PlayerResponse response = playerService.create(leagueId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Player created successfully"));
    }

    @PostMapping("/api/leagues/{leagueId}/players/import")
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> importPlayers(
            @PathVariable Long leagueId,
            @Valid @RequestBody PlayerImportRequest request) {
        List<PlayerResponse> responses = playerService.importPlayers(leagueId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(responses, "Players imported successfully"));
    }

    @GetMapping("/api/leagues/{leagueId}/players")
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> findByLeague(
            @PathVariable Long leagueId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long teamId) {
        List<PlayerResponse> players = playerService.findByLeague(leagueId, category, status, teamId);
        return ResponseEntity.ok(ApiResponse.success(players));
    }

    @GetMapping("/api/leagues/{leagueId}/players/page")
    public ResponseEntity<ApiResponse<PlayerPageResponse>> findByLeaguePaginated(
            @PathVariable Long leagueId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PlayerPageResponse response = playerService.findByLeaguePaginated(leagueId, category, status, teamId, search, page, size);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/api/players/{id}")
    public ResponseEntity<ApiResponse<PlayerResponse>> findById(@PathVariable Long id) {
        PlayerResponse response = playerService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/api/players/{id}")
    public ResponseEntity<ApiResponse<PlayerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody PlayerRequest request) {
        PlayerResponse response = playerService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Player updated successfully"));
    }

    @DeleteMapping("/api/players/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        playerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Player archived successfully"));
    }
}

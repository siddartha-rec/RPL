package com.rpl.auction.team.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.team.dto.TeamRequest;
import com.rpl.auction.team.dto.TeamResponse;
import com.rpl.auction.team.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping("/api/leagues/{leagueId}/teams")
    public ResponseEntity<ApiResponse<TeamResponse>> create(@PathVariable Long leagueId,
                                                            @Valid @RequestBody TeamRequest request) {
        TeamResponse response = teamService.create(leagueId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Team created successfully"));
    }

    @GetMapping("/api/leagues/{leagueId}/teams")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> findByLeague(@PathVariable Long leagueId) {
        List<TeamResponse> teams = teamService.findByLeague(leagueId);
        return ResponseEntity.ok(ApiResponse.success(teams));
    }

    @GetMapping("/api/teams/{id}")
    public ResponseEntity<ApiResponse<TeamResponse>> findById(@PathVariable Long id) {
        TeamResponse response = teamService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/api/teams/{id}")
    public ResponseEntity<ApiResponse<TeamResponse>> update(@PathVariable Long id,
                                                            @Valid @RequestBody TeamRequest request) {
        TeamResponse response = teamService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Team updated successfully"));
    }

    @DeleteMapping("/api/teams/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        teamService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Team archived successfully"));
    }
}

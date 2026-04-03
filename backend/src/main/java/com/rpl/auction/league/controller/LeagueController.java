package com.rpl.auction.league.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.league.dto.LeagueRequest;
import com.rpl.auction.league.dto.LeagueResponse;
import com.rpl.auction.league.service.LeagueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leagues")
@RequiredArgsConstructor
public class LeagueController {

    private final LeagueService leagueService;

    @PostMapping
    public ResponseEntity<ApiResponse<LeagueResponse>> create(@Valid @RequestBody LeagueRequest request) {
        LeagueResponse response = leagueService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "League created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LeagueResponse>>> findAll() {
        List<LeagueResponse> leagues = leagueService.findAll();
        return ResponseEntity.ok(ApiResponse.success(leagues));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LeagueResponse>> findById(@PathVariable Long id) {
        LeagueResponse response = leagueService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LeagueResponse>> update(@PathVariable Long id,
                                                               @Valid @RequestBody LeagueRequest request) {
        LeagueResponse response = leagueService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "League updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        leagueService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "League deleted successfully"));
    }
}

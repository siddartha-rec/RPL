package com.rpl.auction.match.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.match.dto.MatchDetailResponse;
import com.rpl.auction.match.dto.MatchResponse;
import com.rpl.auction.match.entity.Match;
import com.rpl.auction.match.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @GetMapping("/api/leagues/{leagueId}/matches")
    public ResponseEntity<ApiResponse<List<MatchResponse>>> getByLeague(
            @PathVariable Long leagueId,
            @RequestParam(value = "status", required = false) String statusParam) {

        Match.MatchStatus status = parseStatus(statusParam);
        List<MatchResponse> matches = matchService.findByLeague(leagueId, status);
        return ResponseEntity.ok(ApiResponse.success(matches));
    }

    @GetMapping("/api/matches/{id}")
    public ResponseEntity<ApiResponse<MatchDetailResponse>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(matchService.getDetail(id)));
    }

    private Match.MatchStatus parseStatus(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Match.MatchStatus.valueOf(s.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

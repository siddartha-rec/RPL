package com.rpl.auction.cricheroes.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.cricheroes.dto.ImportProgress;
import com.rpl.auction.cricheroes.dto.MatchImportRequest;
import com.rpl.auction.cricheroes.dto.TeamImportRequest;
import com.rpl.auction.cricheroes.dto.TournamentImportRequest;
import com.rpl.auction.cricheroes.service.CricheroesImportService;
import com.rpl.auction.cricheroes.service.ImportProgressRegistry;
import com.rpl.auction.match.entity.Match;
import com.rpl.auction.team.entity.Team;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cricheroes")
@RequiredArgsConstructor
public class CricheroesController {

    private final CricheroesImportService importService;
    private final ImportProgressRegistry progressRegistry;

    @PostMapping("/import/tournament")
    public ResponseEntity<ApiResponse<Map<String, String>>> importTournament(
            @Valid @RequestBody TournamentImportRequest req) {
        ImportProgress progress = progressRegistry.create();
        importService.runTournamentImport(req.getTournamentUrl(), req.getLeagueId(), progress);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(Map.of("jobId", progress.getJobId()), "Import started"));
    }

    @GetMapping("/import/{jobId}")
    public ResponseEntity<ApiResponse<ImportProgress>> getProgress(@PathVariable String jobId) {
        ImportProgress p = progressRegistry.get(jobId);
        if (p == null) throw new ResourceNotFoundException("Import job not found: " + jobId);
        return ResponseEntity.ok(ApiResponse.success(p));
    }

    @PostMapping("/import/team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importTeam(@Valid @RequestBody TeamImportRequest req) {
        Team team = importService.importTeamPublic(req.getCricheroesTeamId(), req.getLeagueId());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("teamId", team.getId(), "name", team.getName(), "cricheroesId", team.getCricheroesId()),
                "Team imported"));
    }

    @PostMapping("/import/match")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importMatch(@Valid @RequestBody MatchImportRequest req) {
        Match match = req.isForce()
                ? importService.reimportMatch(req.getCricheroesMatchId(), req.getTournamentSlug(), req.getMatchSlug(), req.getLeagueId())
                : importService.importMatchPublic(req.getCricheroesMatchId(), req.getTournamentSlug(), req.getMatchSlug(), req.getLeagueId());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("matchId", match.getId(), "cricheroesId", match.getCricheroesId()),
                "Match imported"));
    }
}

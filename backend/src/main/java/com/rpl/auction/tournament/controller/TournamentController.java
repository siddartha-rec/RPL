package com.rpl.auction.tournament.controller;

import com.rpl.auction.common.dto.ApiResponse;
import com.rpl.auction.league.dto.LeagueResponse;
import com.rpl.auction.league.entity.League;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.tournament.dto.TournamentRequest;
import com.rpl.auction.tournament.dto.TournamentResponse;
import com.rpl.auction.tournament.service.TournamentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final LeagueRepository leagueRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TournamentResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.success(tournamentService.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TournamentResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(tournamentService.findById(id)));
    }

    @GetMapping("/{id}/leagues")
    public ResponseEntity<ApiResponse<List<LeagueResponse>>> findLeagues(@PathVariable Long id) {
        List<LeagueResponse> leagues = leagueRepository.findAllByTournamentIdAndArchivedFalse(id).stream()
                .map(LeagueResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(leagues));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TournamentResponse>> create(@Valid @RequestBody TournamentRequest req) {
        TournamentResponse resp = tournamentService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(resp, "Tournament created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TournamentResponse>> update(@PathVariable Long id,
                                                                  @Valid @RequestBody TournamentRequest req) {
        return ResponseEntity.ok(ApiResponse.success(tournamentService.update(id, req), "Tournament updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> archive(@PathVariable Long id) {
        tournamentService.archive(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Tournament archived"));
    }

    /** Helper: assign an existing league to a tournament. */
    @PutMapping("/{tournamentId}/leagues/{leagueId}")
    public ResponseEntity<ApiResponse<Void>> assignLeague(@PathVariable Long tournamentId,
                                                          @PathVariable Long leagueId) {
        tournamentService.getOrThrow(tournamentId);
        League l = leagueRepository.findByIdAndArchivedFalse(leagueId)
                .orElseThrow(() -> new com.rpl.auction.common.exception.ResourceNotFoundException("League not found: " + leagueId));
        leagueRepository.updateTournamentId(l.getId(), tournamentId);
        return ResponseEntity.ok(ApiResponse.success(null, "League assigned to tournament"));
    }
}

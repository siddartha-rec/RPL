package com.rpl.auction.auction.controller;

import com.rpl.auction.auction.dto.*;
import com.rpl.auction.auction.service.AuctionService;
import com.rpl.auction.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;

    @PostMapping("/api/leagues/{leagueId}/auctions")
    public ResponseEntity<ApiResponse<AuctionResponse>> create(@PathVariable Long leagueId) {
        AuctionResponse response = auctionService.create(leagueId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Auction created successfully"));
    }

    @GetMapping("/api/auctions/{id}")
    public ResponseEntity<ApiResponse<AuctionResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuction(id)));
    }

    @GetMapping("/api/leagues/{leagueId}/auction")
    public ResponseEntity<ApiResponse<AuctionResponse>> getByLeague(@PathVariable Long leagueId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuctionByLeague(leagueId)));
    }

    @PutMapping("/api/auctions/{id}/start")
    public ResponseEntity<ApiResponse<AuctionResponse>> start(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.start(id), "Auction started"));
    }

    @PutMapping("/api/auctions/{id}/advance-to-live")
    public ResponseEntity<ApiResponse<AuctionResponse>> advanceToLive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.advanceToLive(id), "Auction advanced to LIVE"));
    }

    @PutMapping("/api/auctions/{id}/next-player/{playerId}")
    public ResponseEntity<ApiResponse<AuctionResponse>> putUpPlayer(
            @PathVariable Long id,
            @PathVariable Long playerId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.putUpPlayer(id, playerId), "Player put up for bidding"));
    }

    @PostMapping("/api/auctions/{id}/bid")
    public ResponseEntity<ApiResponse<BidResponse>> placeBid(
            @PathVariable Long id,
            @Valid @RequestBody BidRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.placeBid(id, request), "Bid placed successfully"));
    }

    @PutMapping("/api/auctions/{id}/sold")
    public ResponseEntity<ApiResponse<AuctionResponse>> soldPlayer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.soldPlayer(id), "Player sold"));
    }

    @PutMapping("/api/auctions/{id}/unsold")
    public ResponseEntity<ApiResponse<AuctionResponse>> markUnsold(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.markUnsold(id), "Player marked unsold"));
    }

    @PutMapping("/api/auctions/{id}/undo-bid")
    public ResponseEntity<ApiResponse<AuctionResponse>> undoBid(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.undoLastBid(id), "Last bid undone"));
    }

    @PutMapping("/api/auctions/{id}/pause")
    public ResponseEntity<ApiResponse<AuctionResponse>> pause(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.pause(id), "Auction paused"));
    }

    @PutMapping("/api/auctions/{id}/resume")
    public ResponseEntity<ApiResponse<AuctionResponse>> resume(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.resume(id), "Auction resumed"));
    }

    @PutMapping("/api/auctions/{id}/switch-to-draft")
    public ResponseEntity<ApiResponse<AuctionResponse>> switchToDraft(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.switchToDraft(id), "Switched to DRAFT mode"));
    }

    @PostMapping("/api/auctions/{id}/retention/pick")
    public ResponseEntity<ApiResponse<AuctionResponse>> retentionPick(
            @PathVariable Long id,
            @Valid @RequestBody PickRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.makeRetentionPick(id, request), "Retention pick made"));
    }

    @PostMapping("/api/auctions/{id}/draft/pick")
    public ResponseEntity<ApiResponse<AuctionResponse>> draftPick(
            @PathVariable Long id,
            @Valid @RequestBody PickRequest request) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.makeDraftPick(id, request), "Draft pick made"));
    }

    @PutMapping("/api/auctions/{id}/complete")
    public ResponseEntity<ApiResponse<AuctionResponse>> complete(
            @PathVariable Long id,
            @RequestParam(name = "force", defaultValue = "false") boolean force) {
        String message = force ? "Auction force-completed" : "Auction completed";
        return ResponseEntity.ok(ApiResponse.success(auctionService.complete(id, force), message));
    }

    @GetMapping("/api/auctions/{id}/completion-check")
    public ResponseEntity<ApiResponse<CompletionCheckResponse>> completionCheck(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getCompletionCheck(id)));
    }

    @GetMapping(value = "/api/auctions/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable Long id) {
        return auctionService.subscribe(id);
    }
}

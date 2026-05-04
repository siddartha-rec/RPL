package com.rpl.auction.auction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Where;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "auctions")
@SQLDelete(sql = "UPDATE auctions SET archived = true WHERE id = ?")
@Where(clause = "archived = false")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Auction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "league_id", nullable = false)
    private Long leagueId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AuctionStatus status = AuctionStatus.NOT_STARTED;

    @Column(name = "current_player_id")
    private Long currentPlayerId;

    @Column(name = "current_base_price", precision = 12, scale = 2)
    private BigDecimal currentBasePrice;

    @Column(name = "current_highest_bid_id")
    private Long currentHighestBidId;

    @Column(name = "timer_seconds") @Builder.Default
    private Integer timerSeconds = 30;

    @Column(name = "current_pick_team_id")
    private Long currentPickTeamId;

    @Column(nullable = false)
    @Builder.Default
    private Boolean archived = false;

    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp @Column(name = "updated_at")
    private Instant updatedAt;

    public enum AuctionStatus { NOT_STARTED, RETENTION, LIVE, PAUSED, DRAFT, COMPLETED }
}

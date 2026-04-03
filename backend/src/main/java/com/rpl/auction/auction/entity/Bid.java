package com.rpl.auction.auction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "bids")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Bid {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auction_id", nullable = false) private Long auctionId;
    @Column(name = "player_id", nullable = false) private Long playerId;
    @Column(name = "team_id", nullable = false) private Long teamId;

    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(name = "bid_order", nullable = false) private Integer bidOrder;
    @Column(name = "is_winning", nullable = false) @Builder.Default private Boolean isWinning = false;

    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}

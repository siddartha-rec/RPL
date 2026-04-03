package com.rpl.auction.auction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "draft_picks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DraftPick {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auction_id", nullable = false) private Long auctionId;
    @Column(name = "player_id", nullable = false) private Long playerId;
    @Column(name = "team_id", nullable = false) private Long teamId;
    @Column(name = "round_number", nullable = false) private Integer roundNumber;
    @Column(name = "pick_order", nullable = false) private Integer pickOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "pick_type", nullable = false, length = 20) private PickType pickType;

    @Column(precision = 12, scale = 2) private BigDecimal cost;

    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;

    public enum PickType { RETENTION, DRAFT }
}

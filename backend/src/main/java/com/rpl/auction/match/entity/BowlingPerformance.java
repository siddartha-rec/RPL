package com.rpl.auction.match.entity;

import com.rpl.auction.player.entity.Player;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "bowling_performances", indexes = {
        @Index(name = "idx_bowling_player", columnList = "player_id"),
        @Index(name = "idx_bowling_innings", columnList = "innings_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BowlingPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "innings_id", nullable = false)
    private Innings innings;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(precision = 4, scale = 1)
    private BigDecimal overs;

    @Column(nullable = false)
    @Builder.Default
    private Integer maidens = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer runs = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer wickets = 0;

    @Column(precision = 5, scale = 2)
    private BigDecimal economy;
}

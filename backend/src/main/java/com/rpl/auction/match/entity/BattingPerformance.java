package com.rpl.auction.match.entity;

import com.rpl.auction.player.entity.Player;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "batting_performances", indexes = {
        @Index(name = "idx_batting_player", columnList = "player_id"),
        @Index(name = "idx_batting_innings", columnList = "innings_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BattingPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "innings_id", nullable = false)
    private Innings innings;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(name = "batting_position")
    private Integer position;

    @Column(nullable = false)
    @Builder.Default
    private Integer runs = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer balls = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer fours = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer sixes = 0;

    @Column(name = "strike_rate", precision = 6, scale = 2)
    private BigDecimal strikeRate;

    @Column(name = "dismissal_type", length = 30)
    private String dismissalType;

    @Column(name = "dismissal_text", length = 200)
    private String dismissalText;
}

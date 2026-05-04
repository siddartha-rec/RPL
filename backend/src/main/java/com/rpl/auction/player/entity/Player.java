package com.rpl.auction.player.entity;

import com.rpl.auction.league.entity.League;
import com.rpl.auction.team.entity.Team;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "players")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "player_number")
    private Integer playerNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlayerCategory category;

    @Column(length = 50)
    private String role;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(name = "base_price", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal basePrice = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PlayerStatus status = PlayerStatus.AVAILABLE;

    @Column(name = "sold_price", precision = 12, scale = 2)
    private BigDecimal soldPrice;

    @Column(name = "is_captain")
    @Builder.Default
    private Boolean isCaptain = false;

    @Column(name = "cricheroes_id", unique = true)
    private Long cricheroesId;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PlayerSource source = PlayerSource.MANUAL;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum PlayerCategory { CRICKET, OTHER }
    public enum PlayerStatus { AVAILABLE, RETAINED, SOLD, UNSOLD }
    public enum Gender { MALE, FEMALE, OTHER }
    public enum PlayerSource { MANUAL, CRICHEROES }
}

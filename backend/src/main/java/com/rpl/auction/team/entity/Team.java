package com.rpl.auction.team.entity;

import com.rpl.auction.league.entity.League;
import com.rpl.auction.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "teams", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "league_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "short_name", nullable = false, length = 10)
    private String shortName;

    @Column(length = 7)
    private String color;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "captain_id")
    private Long captainId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal budget;

    @Column(name = "budget_spent", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal budgetSpent = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

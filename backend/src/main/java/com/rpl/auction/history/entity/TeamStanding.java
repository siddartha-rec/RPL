package com.rpl.auction.history.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "team_standings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"team_id", "league_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamStanding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "league_id", nullable = false)
    private Long leagueId;

    @Column(name = "rank_position", nullable = false)
    private Integer rank;

    private Integer points;
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

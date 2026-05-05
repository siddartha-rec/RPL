package com.rpl.auction.tournament.dto;

import com.rpl.auction.tournament.entity.Tournament;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class TournamentResponse {
    private Long id;
    private String name;
    private String slug;
    private String logoUrl;
    private String description;
    private String cricheroesBrandName;
    private Long leagueCount;
    private Instant createdAt;
    private Instant updatedAt;

    public static TournamentResponse from(Tournament t, Long leagueCount) {
        return TournamentResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .slug(t.getSlug())
                .logoUrl(t.getLogoUrl())
                .description(t.getDescription())
                .cricheroesBrandName(t.getCricheroesBrandName())
                .leagueCount(leagueCount)
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}

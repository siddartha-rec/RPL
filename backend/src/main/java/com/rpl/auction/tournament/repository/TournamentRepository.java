package com.rpl.auction.tournament.repository;

import com.rpl.auction.tournament.entity.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {
    Optional<Tournament> findBySlug(String slug);
    boolean existsBySlug(String slug);

    @Query(value = "SELECT * FROM tournaments WHERE slug = :slug LIMIT 1", nativeQuery = true)
    Optional<Tournament> findAnyBySlug(@Param("slug") String slug);

    @Query(value = "SELECT * FROM tournaments WHERE cricheroes_brand_name = :brand LIMIT 1", nativeQuery = true)
    Optional<Tournament> findAnyByCricheroesBrandName(@Param("brand") String brand);
}

package com.rpl.auction.league.repository;

import com.rpl.auction.league.entity.League;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface LeagueRepository extends JpaRepository<League, Long> {
    Optional<League> findBySeasonAndArchivedFalse(String season);
    boolean existsBySeasonAndArchivedFalse(String season);
    Optional<League> findByIdAndArchivedFalse(Long id);
    List<League> findAllByArchivedFalse();
    Optional<League> findByCricheroesId(Long cricheroesId);

    @Query(value = "SELECT * FROM leagues WHERE cricheroes_id = :cricheroesId LIMIT 1", nativeQuery = true)
    Optional<League> findAnyByCricheroesId(@Param("cricheroesId") Long cricheroesId);

    @Modifying
    @Transactional
    @Query("""
            UPDATE League l
            SET l.archived = false,
                l.name = :name,
                l.season = :season,
                l.seasonDisplayName = :seasonDisplayName,
                l.cricheroesId = :cricheroesId
            WHERE l.id = :id
            """)
    int reviveAndUpdateImportedLeagueById(@Param("id") Long id,
                                          @Param("name") String name,
                                          @Param("season") String season,
                                          @Param("seasonDisplayName") String seasonDisplayName,
                                          @Param("cricheroesId") Long cricheroesId);
}

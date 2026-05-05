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

    List<League> findAllByTournamentIdAndArchivedFalse(Long tournamentId);
    long countByTournamentIdAndArchivedFalse(Long tournamentId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE leagues SET tournament_id = :tournamentId WHERE id = :id", nativeQuery = true)
    int updateTournamentId(@Param("id") Long id, @Param("tournamentId") Long tournamentId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query(value = """
            UPDATE leagues
            SET archived = FALSE,
                name = :name,
                season = :season,
                season_display_name = :seasonDisplayName,
                cricheroes_id = :cricheroesId
            WHERE id = :id
            """, nativeQuery = true)
    int reviveAndUpdateImportedLeagueById(@Param("id") Long id,
                                          @Param("name") String name,
                                          @Param("season") String season,
                                          @Param("seasonDisplayName") String seasonDisplayName,
                                          @Param("cricheroesId") Long cricheroesId);
}

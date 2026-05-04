package com.rpl.auction.team.repository;

import com.rpl.auction.team.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByLeagueId(Long leagueId);
    Optional<Team> findByOwnerIdAndLeagueId(Long ownerId, Long leagueId);
    boolean existsByNameAndLeagueId(String name, Long leagueId);
    @Query(value = "SELECT * FROM teams WHERE cricheroes_id = :cricheroesId AND league_id = :leagueId LIMIT 1",
            nativeQuery = true)
    Optional<Team> findAnyByCricheroesIdAndLeagueId(@Param("cricheroesId") Long cricheroesId,
                                                   @Param("leagueId") Long leagueId);
    @Query(value = "SELECT id FROM teams WHERE league_id = :leagueId", nativeQuery = true)
    List<Long> findAnyIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query("DELETE FROM Team t WHERE t.league.id = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query(value = "DELETE FROM teams WHERE league_id = :leagueId", nativeQuery = true)
    int hardDeleteByLeagueId(@Param("leagueId") Long leagueId);
}

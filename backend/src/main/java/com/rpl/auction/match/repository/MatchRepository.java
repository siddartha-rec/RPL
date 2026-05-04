package com.rpl.auction.match.repository;

import com.rpl.auction.match.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {
    Optional<Match> findByCricheroesId(Long cricheroesId);
    @Query(value = "SELECT * FROM matches WHERE cricheroes_id = :cricheroesId LIMIT 1", nativeQuery = true)
    Optional<Match> findAnyByCricheroesId(@Param("cricheroesId") Long cricheroesId);
    boolean existsByCricheroesId(Long cricheroesId);
    List<Match> findByLeagueIdOrderByScheduledAtAsc(Long leagueId);

    @Query("SELECT m.id FROM Match m WHERE m.league.id = :leagueId")
    List<Long> findIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Query(value = "SELECT id FROM matches WHERE league_id = :leagueId", nativeQuery = true)
    List<Long> findAnyIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query("DELETE FROM Match m WHERE m.league.id = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query(value = "DELETE FROM matches WHERE league_id = :leagueId", nativeQuery = true)
    int hardDeleteByLeagueId(@Param("leagueId") Long leagueId);

    @Query(value = "SELECT id FROM matches WHERE team_a_id IN :teamIds OR team_b_id IN :teamIds " +
                   "OR winner_team_id IN :teamIds OR toss_winner_team_id IN :teamIds",
            nativeQuery = true)
    List<Long> findIdsByAnyTeamIdIn(@Param("teamIds") Collection<Long> teamIds);

    @Modifying
    @Query(value = "DELETE FROM matches WHERE team_a_id IN :teamIds OR team_b_id IN :teamIds " +
                   "OR winner_team_id IN :teamIds OR toss_winner_team_id IN :teamIds",
            nativeQuery = true)
    int hardDeleteByAnyTeamIdIn(@Param("teamIds") Collection<Long> teamIds);
}

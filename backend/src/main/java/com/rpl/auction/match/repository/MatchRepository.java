package com.rpl.auction.match.repository;

import com.rpl.auction.match.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {
    Optional<Match> findByCricheroesId(Long cricheroesId);
    boolean existsByCricheroesId(Long cricheroesId);
    List<Match> findByLeagueIdOrderByScheduledAtAsc(Long leagueId);

    @Query("SELECT m.id FROM Match m WHERE m.league.id = :leagueId")
    List<Long> findIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query("DELETE FROM Match m WHERE m.league.id = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);
}

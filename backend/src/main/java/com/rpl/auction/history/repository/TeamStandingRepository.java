package com.rpl.auction.history.repository;

import com.rpl.auction.history.entity.TeamStanding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamStandingRepository extends JpaRepository<TeamStanding, Long> {
    List<TeamStanding> findByLeagueIdOrderByRankAsc(Long leagueId);

    @Modifying
    @Query("DELETE FROM TeamStanding ts WHERE ts.leagueId = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);
}

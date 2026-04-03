package com.rpl.auction.history.repository;

import com.rpl.auction.history.entity.TeamStanding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeamStandingRepository extends JpaRepository<TeamStanding, Long> {
    List<TeamStanding> findByLeagueIdOrderByRankAsc(Long leagueId);
}

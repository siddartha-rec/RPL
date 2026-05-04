package com.rpl.auction.history.repository;

import com.rpl.auction.history.entity.PlayerHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlayerHistoryRepository extends JpaRepository<PlayerHistory, Long> {
    List<PlayerHistory> findByPlayerIdOrderByCreatedAtDesc(Long playerId);
    List<PlayerHistory> findByLeagueId(Long leagueId);

    @Modifying
    @Query("DELETE FROM PlayerHistory ph WHERE ph.leagueId = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);
}

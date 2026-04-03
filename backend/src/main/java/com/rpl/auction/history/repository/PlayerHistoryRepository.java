package com.rpl.auction.history.repository;

import com.rpl.auction.history.entity.PlayerHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlayerHistoryRepository extends JpaRepository<PlayerHistory, Long> {
    List<PlayerHistory> findByPlayerIdOrderByCreatedAtDesc(Long playerId);
    List<PlayerHistory> findByLeagueId(Long leagueId);
}

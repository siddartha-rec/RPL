package com.rpl.auction.match.repository;

import com.rpl.auction.match.entity.BowlingPerformance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface BowlingPerformanceRepository extends JpaRepository<BowlingPerformance, Long> {
    List<BowlingPerformance> findByInningsId(Long inningsId);
    List<BowlingPerformance> findByPlayerId(Long playerId);

    @Modifying
    @Query("DELETE FROM BowlingPerformance bp WHERE bp.innings.id IN :inningsIds")
    int deleteByInningsIdIn(@Param("inningsIds") Collection<Long> inningsIds);

    @Modifying
    @Query("DELETE FROM BowlingPerformance bp WHERE bp.player.id IN :playerIds")
    int deleteByPlayerIdIn(@Param("playerIds") Collection<Long> playerIds);
}

package com.rpl.auction.match.repository;

import com.rpl.auction.match.entity.BattingPerformance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface BattingPerformanceRepository extends JpaRepository<BattingPerformance, Long> {
    List<BattingPerformance> findByInningsIdOrderByPositionAsc(Long inningsId);
    List<BattingPerformance> findByPlayerId(Long playerId);

    @Modifying
    @Query("DELETE FROM BattingPerformance bp WHERE bp.innings.id IN :inningsIds")
    int deleteByInningsIdIn(@Param("inningsIds") Collection<Long> inningsIds);
}

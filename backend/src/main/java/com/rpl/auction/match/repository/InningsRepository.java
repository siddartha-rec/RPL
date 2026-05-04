package com.rpl.auction.match.repository;

import com.rpl.auction.match.entity.Innings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InningsRepository extends JpaRepository<Innings, Long> {
    List<Innings> findByMatchIdOrderByInningsNumberAsc(Long matchId);

    @Query("SELECT i.id FROM Innings i WHERE i.match.id IN :matchIds")
    List<Long> findIdsByMatchIdIn(@Param("matchIds") Collection<Long> matchIds);

    @Modifying
    @Query("DELETE FROM Innings i WHERE i.match.id IN :matchIds")
    int deleteByMatchIdIn(@Param("matchIds") Collection<Long> matchIds);
}

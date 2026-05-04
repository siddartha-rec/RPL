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

    @Modifying
    @Query("DELETE FROM Team t WHERE t.league.id = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);
}

package com.rpl.auction.player.repository;

import com.rpl.auction.player.entity.Player;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByLeagueId(Long leagueId);
    List<Player> findByTeamId(Long teamId);
    List<Player> findByLeagueIdAndStatus(Long leagueId, Player.PlayerStatus status);
    List<Player> findByLeagueIdAndCategory(Long leagueId, Player.PlayerCategory category);
    List<Player> findByLeagueIdAndTeamId(Long leagueId, Long teamId);
    long countByTeamId(Long teamId);

    @Query("SELECT p FROM Player p WHERE p.league.id = :leagueId " +
           "AND (:category IS NULL OR p.category = :category) " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:teamId IS NULL OR p.team.id = :teamId) " +
           "AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Player> findFiltered(
        @Param("leagueId") Long leagueId,
        @Param("category") Player.PlayerCategory category,
        @Param("status") Player.PlayerStatus status,
        @Param("teamId") Long teamId,
        @Param("search") String search,
        Pageable pageable);
}

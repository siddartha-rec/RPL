package com.rpl.auction.player.repository;

import com.rpl.auction.player.entity.Player;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByLeagueId(Long leagueId);

    @Query(value = "SELECT * FROM players WHERE cricheroes_id = :cricheroesId AND league_id = :leagueId LIMIT 1",
            nativeQuery = true)
    Optional<Player> findAnyByCricheroesIdAndLeagueId(@Param("cricheroesId") Long cricheroesId,
                                                     @Param("leagueId") Long leagueId);

    @Modifying
    @Query("DELETE FROM Player p WHERE p.league.id = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query(value = "DELETE FROM players WHERE league_id = :leagueId", nativeQuery = true)
    int hardDeleteByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query(value = "DELETE FROM players WHERE team_id IN :teamIds", nativeQuery = true)
    int hardDeleteByTeamIdIn(@Param("teamIds") List<Long> teamIds);

    @Query(value = "SELECT id FROM players WHERE league_id = :leagueId", nativeQuery = true)
    List<Long> findAnyIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Query(value = "SELECT id FROM players WHERE team_id IN :teamIds", nativeQuery = true)
    List<Long> findAnyIdsByTeamIdIn(@Param("teamIds") List<Long> teamIds);

    List<Player> findByTeamId(Long teamId);
    List<Player> findByLeagueIdAndStatus(Long leagueId, Player.PlayerStatus status);
    List<Player> findByLeagueIdAndCategory(Long leagueId, Player.PlayerCategory category);
    List<Player> findByLeagueIdAndTeamId(Long leagueId, Long teamId);
    long countByTeamId(Long teamId);
    long countByTeamIdAndGender(Long teamId, Player.Gender gender);

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

package com.rpl.auction.player.repository;

import com.rpl.auction.player.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByLeagueId(Long leagueId);
    List<Player> findByTeamId(Long teamId);
    List<Player> findByLeagueIdAndStatus(Long leagueId, Player.PlayerStatus status);
    List<Player> findByLeagueIdAndCategory(Long leagueId, Player.PlayerCategory category);
    List<Player> findByLeagueIdAndTeamId(Long leagueId, Long teamId);
    long countByTeamId(Long teamId);
}

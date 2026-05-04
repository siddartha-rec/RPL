package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.Auction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    List<Auction> findByLeagueId(Long leagueId);
    Optional<Auction> findFirstByLeagueId(Long leagueId);
    boolean existsByLeagueId(Long leagueId);

    @Query("SELECT a.id FROM Auction a WHERE a.leagueId = :leagueId")
    List<Long> findIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Query(value = "SELECT id FROM auctions WHERE league_id = :leagueId", nativeQuery = true)
    List<Long> findAnyIdsByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query("DELETE FROM Auction a WHERE a.leagueId = :leagueId")
    int deleteByLeagueId(@Param("leagueId") Long leagueId);

    @Modifying
    @Query(value = "DELETE FROM auctions WHERE league_id = :leagueId", nativeQuery = true)
    int hardDeleteByLeagueId(@Param("leagueId") Long leagueId);
}

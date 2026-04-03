package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.Auction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    List<Auction> findByLeagueId(Long leagueId);
    Optional<Auction> findFirstByLeagueId(Long leagueId);
    boolean existsByLeagueId(Long leagueId);
}

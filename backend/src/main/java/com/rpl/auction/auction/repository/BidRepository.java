package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuctionIdAndPlayerIdOrderByBidOrderDesc(Long auctionId, Long playerId);
    Optional<Bid> findTopByAuctionIdAndPlayerIdOrderByBidOrderDesc(Long auctionId, Long playerId);
    long countByAuctionIdAndPlayerId(Long auctionId, Long playerId);

    @Modifying
    @Query("DELETE FROM Bid b WHERE b.auctionId IN :auctionIds")
    int deleteByAuctionIdIn(@Param("auctionIds") Collection<Long> auctionIds);
}

package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.DraftPick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DraftPickRepository extends JpaRepository<DraftPick, Long> {
    List<DraftPick> findByAuctionIdOrderByPickOrderAsc(Long auctionId);
    List<DraftPick> findByAuctionIdAndPickType(Long auctionId, DraftPick.PickType pickType);
    long countByAuctionIdAndTeamIdAndPickType(Long auctionId, Long teamId, DraftPick.PickType pickType);
    Optional<DraftPick> findByAuctionIdAndPlayerIdAndPickType(Long auctionId, Long playerId, DraftPick.PickType pickType);

    @Modifying
    @Query("DELETE FROM DraftPick dp WHERE dp.auctionId IN :auctionIds")
    int deleteByAuctionIdIn(@Param("auctionIds") Collection<Long> auctionIds);
}

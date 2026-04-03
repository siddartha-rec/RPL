package com.rpl.auction.auction.repository;

import com.rpl.auction.auction.entity.DraftPick;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DraftPickRepository extends JpaRepository<DraftPick, Long> {
    List<DraftPick> findByAuctionIdOrderByPickOrderAsc(Long auctionId);
    List<DraftPick> findByAuctionIdAndPickType(Long auctionId, DraftPick.PickType pickType);
    long countByAuctionIdAndTeamIdAndPickType(Long auctionId, Long teamId, DraftPick.PickType pickType);
}

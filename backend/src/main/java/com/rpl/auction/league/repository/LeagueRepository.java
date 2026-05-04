package com.rpl.auction.league.repository;

import com.rpl.auction.league.entity.League;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LeagueRepository extends JpaRepository<League, Long> {
    Optional<League> findBySeason(String season);
    boolean existsBySeason(String season);
    Optional<League> findByCricheroesId(Long cricheroesId);
}

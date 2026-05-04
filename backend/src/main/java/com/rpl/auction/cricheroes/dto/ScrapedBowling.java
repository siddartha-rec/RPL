package com.rpl.auction.cricheroes.dto;

import java.math.BigDecimal;

public record ScrapedBowling(
        Long cricheroesPlayerId,
        String name,
        BigDecimal overs,
        Integer maidens,
        Integer runs,
        Integer wickets,
        BigDecimal economy
) {}

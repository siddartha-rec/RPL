package com.rpl.auction.cricheroes.dto;

public record ScrapedPlayer(
        Long cricheroesId,
        String name,
        String profilePhoto,
        String playerSkill,
        boolean isCaptain
) {}

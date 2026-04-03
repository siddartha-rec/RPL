package com.rpl.auction.auction.dto;

import lombok.*;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuctionEvent {
    private String type;
    private Map<String, Object> data;
}

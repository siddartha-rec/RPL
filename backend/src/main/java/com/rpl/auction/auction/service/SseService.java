package com.rpl.auction.auction.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rpl.auction.auction.dto.AuctionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class SseService {

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long auctionId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(auctionId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(auctionId, emitter));
        emitter.onTimeout(() -> removeEmitter(auctionId, emitter));
        emitter.onError(e -> removeEmitter(auctionId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of("auctionId", auctionId)));
        } catch (IOException e) {
            log.warn("Failed to send connected event for auction {}: {}", auctionId, e.getMessage());
            removeEmitter(auctionId, emitter);
        }

        return emitter;
    }

    public void broadcast(Long auctionId, AuctionEvent event) {
        CopyOnWriteArrayList<SseEmitter> auctionEmitters = emitters.get(auctionId);
        if (auctionEmitters == null || auctionEmitters.isEmpty()) {
            return;
        }

        String jsonData;
        try {
            jsonData = objectMapper.writeValueAsString(event.getData());
        } catch (IOException e) {
            log.error("Failed to serialize event data for auction {}: {}", auctionId, e.getMessage());
            return;
        }

        for (SseEmitter emitter : auctionEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(event.getType())
                        .data(jsonData));
            } catch (IOException e) {
                log.warn("Failed to send SSE event to emitter for auction {}: {}", auctionId, e.getMessage());
                removeEmitter(auctionId, emitter);
            }
        }
    }

    private void removeEmitter(Long auctionId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> auctionEmitters = emitters.get(auctionId);
        if (auctionEmitters != null) {
            auctionEmitters.remove(emitter);
        }
    }
}

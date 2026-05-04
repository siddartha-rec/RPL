package com.rpl.auction.cricheroes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class CricheroesClient {

    private static final String UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
    private static final long THROTTLE_MS = 1000L;
    private static final int MAX_RETRIES = 3;
    static final String BASE = "https://cricheroes.com";

    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();
    private long lastFetchEpochMs = 0L;

    public synchronized JsonNode fetchPageProps(String path) {
        String url = path.startsWith("http") ? path : BASE + path;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            throttle();
            try {
                HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(30))
                        .header("User-Agent", UA)
                        .header("Accept", "text/html,application/xhtml+xml")
                        .GET()
                        .build();
                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                int code = resp.statusCode();
                if (code == 429 || code == 503) {
                    sleep(2000L * attempt);
                    continue;
                }
                if (code >= 400) {
                    throw new CricheroesScrapeException("HTTP " + code + " for " + url);
                }
                return extractPageProps(resp.body(), url);
            } catch (IOException | InterruptedException e) {
                if (attempt == MAX_RETRIES) {
                    throw new CricheroesScrapeException("Fetch failed after " + MAX_RETRIES + " attempts: " + url, e);
                }
                sleep(1000L * attempt);
            }
        }
        throw new CricheroesScrapeException("Unreachable: " + url);
    }

    private JsonNode extractPageProps(String html, String url) {
        Document doc = Jsoup.parse(html);
        Element script = doc.selectFirst("script#__NEXT_DATA__");
        if (script == null) {
            throw new CricheroesScrapeException("No __NEXT_DATA__ on " + url);
        }
        try {
            JsonNode root = mapper.readTree(script.data());
            JsonNode pp = root.path("props").path("pageProps");
            if (pp.isMissingNode() || pp.isNull()) {
                throw new CricheroesScrapeException("No pageProps on " + url);
            }
            return pp;
        } catch (IOException e) {
            throw new CricheroesScrapeException("Parse __NEXT_DATA__ failed for " + url, e);
        }
    }

    private void throttle() {
        long now = System.currentTimeMillis();
        long wait = THROTTLE_MS - (now - lastFetchEpochMs);
        if (wait > 0) sleep(wait);
        lastFetchEpochMs = System.currentTimeMillis();
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

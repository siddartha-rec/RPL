package com.rpl.auction.cricheroes.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class ImportProgress {
    private String jobId;
    private Status status = Status.PENDING;
    private String currentStep;
    private int teamsTotal;
    private int teamsDone;
    private int playersTotal;
    private int playersDone;
    private int matchesTotal;
    private int matchesDone;
    private int matchesSkipped;
    private Long leagueId;
    private String errorMessage;
    private final List<String> warnings = new ArrayList<>();
    private Instant startedAt = Instant.now();
    private Instant finishedAt;

    public void addWarning(String msg) {
        warnings.add(msg);
    }

    public enum Status { PENDING, RUNNING, COMPLETED, FAILED }
}

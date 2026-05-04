package com.rpl.auction.cricheroes.service;

import com.rpl.auction.cricheroes.dto.ImportProgress;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ImportProgressRegistry {

    private final ConcurrentHashMap<String, ImportProgress> jobs = new ConcurrentHashMap<>();

    public ImportProgress create() {
        ImportProgress p = new ImportProgress();
        p.setJobId(UUID.randomUUID().toString());
        jobs.put(p.getJobId(), p);
        return p;
    }

    public ImportProgress get(String jobId) {
        return jobs.get(jobId);
    }
}

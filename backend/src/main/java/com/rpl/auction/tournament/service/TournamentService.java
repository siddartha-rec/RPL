package com.rpl.auction.tournament.service;

import com.rpl.auction.common.exception.BadRequestException;
import com.rpl.auction.common.exception.ResourceNotFoundException;
import com.rpl.auction.league.repository.LeagueRepository;
import com.rpl.auction.tournament.dto.TournamentRequest;
import com.rpl.auction.tournament.dto.TournamentResponse;
import com.rpl.auction.tournament.entity.Tournament;
import com.rpl.auction.tournament.repository.TournamentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TournamentService {

    private final TournamentRepository tournamentRepository;
    private final LeagueRepository leagueRepository;

    @Transactional(readOnly = true)
    public List<TournamentResponse> findAll() {
        return tournamentRepository.findAll().stream()
                .map(t -> TournamentResponse.from(t,
                        leagueRepository.countByTournamentIdAndArchivedFalse(t.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public TournamentResponse findById(Long id) {
        Tournament t = getOrThrow(id);
        return TournamentResponse.from(t,
                leagueRepository.countByTournamentIdAndArchivedFalse(t.getId()));
    }

    @Transactional
    public TournamentResponse create(TournamentRequest request) {
        String slug = resolveSlug(request.getSlug(), request.getName());
        if (tournamentRepository.existsBySlug(slug)) {
            throw new BadRequestException("A tournament with slug '" + slug + "' already exists");
        }
        Tournament t = Tournament.builder()
                .name(request.getName())
                .slug(slug)
                .logoUrl(request.getLogoUrl())
                .description(request.getDescription())
                .build();
        return TournamentResponse.from(tournamentRepository.save(t), 0L);
    }

    @Transactional
    public TournamentResponse update(Long id, TournamentRequest request) {
        Tournament t = getOrThrow(id);
        String slug = resolveSlug(request.getSlug(), request.getName());
        if (!t.getSlug().equals(slug) && tournamentRepository.existsBySlug(slug)) {
            throw new BadRequestException("A tournament with slug '" + slug + "' already exists");
        }
        t.setName(request.getName());
        t.setSlug(slug);
        t.setLogoUrl(request.getLogoUrl());
        t.setDescription(request.getDescription());
        Tournament saved = tournamentRepository.save(t);
        return TournamentResponse.from(saved,
                leagueRepository.countByTournamentIdAndArchivedFalse(saved.getId()));
    }

    @Transactional
    public void archive(Long id) {
        Tournament t = getOrThrow(id);
        long childCount = leagueRepository.countByTournamentIdAndArchivedFalse(id);
        if (childCount > 0) {
            throw new BadRequestException("Tournament has " + childCount + " active league(s). Archive or reassign them first.");
        }
        tournamentRepository.delete(t);
    }

    /**
     * Upsert by cricheroes brand name. Used during import to find/create the parent
     * Tournament for an imported league season.
     */
    @Transactional
    public Tournament upsertByCricheroesBrand(String brandName) {
        if (brandName == null || brandName.isBlank()) return null;
        Optional<Tournament> existing = tournamentRepository.findAnyByCricheroesBrandName(brandName);
        if (existing.isPresent()) return existing.get();
        String slug = slugify(brandName);
        Optional<Tournament> bySlug = tournamentRepository.findAnyBySlug(slug);
        if (bySlug.isPresent()) {
            Tournament t = bySlug.get();
            if (t.getCricheroesBrandName() == null) {
                t.setCricheroesBrandName(brandName);
                tournamentRepository.save(t);
            }
            return t;
        }
        Tournament t = Tournament.builder()
                .name(brandName)
                .slug(slug)
                .cricheroesBrandName(brandName)
                .build();
        return tournamentRepository.save(t);
    }

    public Tournament getOrThrow(Long id) {
        return tournamentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournament not found with id: " + id));
    }

    private String resolveSlug(String requested, String name) {
        if (requested != null && !requested.isBlank()) return slugify(requested);
        return slugify(name);
    }

    private String slugify(String s) {
        return s == null ? "" : s.toLowerCase().trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
    }
}

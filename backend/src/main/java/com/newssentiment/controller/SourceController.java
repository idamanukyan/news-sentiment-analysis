package com.newssentiment.controller;

import com.newssentiment.dto.SourceDTO;
import com.newssentiment.model.Source;
import com.newssentiment.repository.SourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sources")
@RequiredArgsConstructor
public class SourceController {

    private final SourceRepository sourceRepository;

    @GetMapping
    public ResponseEntity<List<SourceDTO>> getSources(
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Boolean active
    ) {
        List<Source> sources;

        if (active != null && active) {
            sources = sourceRepository.findByActiveTrue();
        } else if (language != null) {
            sources = sourceRepository.findByLanguage(Source.Language.valueOf(language.toUpperCase()));
        } else {
            sources = sourceRepository.findAll();
        }

        List<SourceDTO> dtos = sources.stream()
                .map(s -> new SourceDTO(
                        s.getId(),
                        s.getName(),
                        s.getUrl(),
                        s.getType().name(),
                        s.getLanguage().name(),
                        s.getActive(),
                        s.getLastFetched(),
                        s.getLastSuccess()
                ))
                .toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SourceDTO> getSource(@PathVariable Long id) {
        return sourceRepository.findById(id)
                .map(s -> new SourceDTO(
                        s.getId(),
                        s.getName(),
                        s.getUrl(),
                        s.getType().name(),
                        s.getLanguage().name(),
                        s.getActive(),
                        s.getLastFetched(),
                        s.getLastSuccess()
                ))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

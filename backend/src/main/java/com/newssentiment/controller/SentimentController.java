package com.newssentiment.controller;

import com.newssentiment.dto.SentimentAggregateDTO;
import com.newssentiment.service.SentimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sentiment")
@RequiredArgsConstructor
public class SentimentController {

    private final SentimentService sentimentService;

    @GetMapping("/aggregate")
    public ResponseEntity<List<SentimentAggregateDTO>> getAggregated(
            @RequestParam String groupBy,
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        List<SentimentAggregateDTO> result = switch (groupBy.toLowerCase()) {
            case "day" -> sentimentService.getAggregatedByDay(from, to);
            case "source" -> sentimentService.getAggregatedBySource(from, to);
            default -> throw new IllegalArgumentException("Invalid groupBy: " + groupBy);
        };

        return ResponseEntity.ok(result);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getSummary(
            @RequestParam Instant from,
            @RequestParam Instant to
    ) {
        return ResponseEntity.ok(sentimentService.getOverallCounts(from, to));
    }
}

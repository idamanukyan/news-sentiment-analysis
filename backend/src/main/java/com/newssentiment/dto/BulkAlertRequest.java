package com.newssentiment.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BulkAlertRequest(
    @NotEmpty(message = "Alert IDs cannot be empty")
    List<Long> alertIds
) {}

package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyCreateRequest(
        @NotBlank String content
) {}

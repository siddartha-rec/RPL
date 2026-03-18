package com.rpl.auction.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private List<FieldErrorDetail> errors;
    private Instant timestamp;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .errors(null)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .errors(null)
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String message, List<FieldErrorDetail> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .data(null)
                .errors(errors)
                .timestamp(Instant.now())
                .build();
    }
}

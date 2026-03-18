package com.rpl.auction.common.exception;

import com.rpl.auction.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleResourceNotFound_returns404() {
        var ex = new ResourceNotFoundException("User", 1L);
        ResponseEntity<ApiResponse<Void>> response = handler.handleResourceNotFound(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("User");
    }

    @Test
    void handleBadRequest_returns400() {
        var ex = new BadRequestException("Invalid input");
        ResponseEntity<ApiResponse<Void>> response = handler.handleBadRequest(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void handleUnauthorized_returns401() {
        var ex = new UnauthorizedException("Invalid credentials");
        ResponseEntity<ApiResponse<Void>> response = handler.handleUnauthorized(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void handleForbidden_returns403() {
        var ex = new ForbiddenException("Insufficient permissions");
        ResponseEntity<ApiResponse<Void>> response = handler.handleForbidden(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void apiResponse_success_hasCorrectShape() {
        ApiResponse<String> response = ApiResponse.success("test data", "OK");
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo("test data");
        assertThat(response.getMessage()).isEqualTo("OK");
        assertThat(response.getErrors()).isNull();
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    void apiResponse_error_hasCorrectShape() {
        ApiResponse<Void> response = ApiResponse.error("Something failed");
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getData()).isNull();
        assertThat(response.getMessage()).isEqualTo("Something failed");
        assertThat(response.getTimestamp()).isNotNull();
    }
}

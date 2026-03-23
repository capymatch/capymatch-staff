/**
 * Parse a backend error response into a user-friendly message + request_id.
 *
 * Handles both structured errors ({ error: { code, message, request_id } })
 * and legacy FastAPI errors ({ detail: "..." }).
 */
export function parseApiError(err) {
  const data = err?.response?.data;

  // Structured error envelope
  if (data?.error?.message) {
    return {
      message: data.error.message,
      code: data.error.code || "UNKNOWN",
      requestId: data.error.request_id || null,
    };
  }

  // Legacy FastAPI { detail: "..." }
  if (data?.detail) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    return {
      message: detail,
      code: "HTTP_ERROR",
      requestId: null,
    };
  }

  // Network / timeout errors
  if (err?.message) {
    return {
      message: err.code === "ERR_NETWORK" ? "Network error — check your connection" : err.message,
      code: err.code || "CLIENT_ERROR",
      requestId: null,
    };
  }

  return {
    message: "Something went wrong",
    code: "UNKNOWN",
    requestId: null,
  };
}

/**
 * Get a single user-friendly message string from any API error.
 */
export function getErrorMessage(err) {
  return parseApiError(err).message;
}

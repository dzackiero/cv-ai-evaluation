export interface ApiResponse<T> {
  message: string;
  data: T | null;
}

export interface ErrorResponse {
  message: string;
  data: {
    status_code: number;
    timestamp: string;
    path: string;
    stack?: string;
  };
}

export function successResponse<T>(
  data: T | null = null,
  message: string = 'success',
): ApiResponse<T> {
  return {
    message,
    data,
  };
}

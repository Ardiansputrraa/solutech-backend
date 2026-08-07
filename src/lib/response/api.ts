/**
 * Standard API Response Helper
 * Format response konsisten untuk seluruh endpoint REST API.
 *
 * Response sukses:
 * { success: true, statusCode: number, message: string, data: T }
 *
 * Response error:
 * { success: false, statusCode: number, message: string, errors?: unknown }
 */

export function apiSuccess<T>(
  data: T,
  message: string = "Success",
  status: number = 200
): Response {
  return Response.json(
    {
      success: true,
      statusCode: status,
      message,
      data,
    },
    { status }
  );
}

export function apiError(
  message: string,
  status: number = 500,
  errors?: unknown
): Response {
  const body = {
    success: false,
    statusCode: status,
    message,
    ...(errors !== undefined && { errors }),
  };
  return Response.json(body, { status });
}

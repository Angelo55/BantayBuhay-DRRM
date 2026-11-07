export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    // Only send a JSON type with a body: the API rejects an empty JSON body.
    headers: options.body === undefined ? {} : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? `The request failed (${response.status})`);
  }
  return data as T;
}

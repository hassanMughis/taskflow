type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  authenticated?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function clearStoredSession() {
  localStorage.removeItem("kanvero_token");
  localStorage.removeItem("kanvero_user");
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, authenticated = true } = options;
  const token = typeof window === "undefined" ? null : localStorage.getItem("kanvero_token");
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: (T & { message?: string }) | undefined;

  if (text) {
    try {
      data = JSON.parse(text) as T & { message?: string };
    } catch {
      if (response.ok) {
        throw new ApiError("The server returned an invalid response", response.status);
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && authenticated && typeof window !== "undefined") {
      clearStoredSession();
      if (window.location.pathname !== "/login") window.location.replace("/login");
    }
    throw new ApiError(data?.message || "Request failed", response.status);
  }

  return data as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown, authenticated = true) {
  return apiRequest<T>(path, { method: "POST", body, authenticated });
}

export function apiPatch<T>(path: string, body: unknown) {
  return apiRequest<T>(path, { method: "PATCH", body });
}

export function apiPut<T>(path: string, body: unknown) {
  return apiRequest<T>(path, { method: "PUT", body });
}

export function apiDelete(path: string) {
  return apiRequest<void>(path, { method: "DELETE" });
}

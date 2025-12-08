import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (res.status === 401) {
      // Clear auth state and redirect to login
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    // Try to parse error JSON
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      // If text or empty, it's not JSON, so we'll rely on statusText or a generic message.
    }

    // Construct robust error object
    const error = new Error(errorData?.message || res.statusText || "Unknown error");
    (error as any).status = res.status;
    (error as any).code = errorData?.code;
    (error as any).details = errorData;

    const traceId = res.headers.get("X-Trace-ID");
    if (traceId) {
      console.error(`[Request Failed] Trace ID: ${traceId}`);
      (error as any).traceId = traceId; // Add traceId to the error object
    }

    throw error;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const path = queryKey.join("/");
      const fullUrl = path.startsWith("http") ? path : `${API_BASE}${path}`;

      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

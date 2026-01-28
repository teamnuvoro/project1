import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

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
      const text = await res.clone().text();
      if (text) {
        errorData = JSON.parse(text);
      }
    } catch {
      // If text or empty, it's not JSON, so we'll rely on statusText or a generic message.
    }

    // Construct robust error object - prioritize details field for better error messages
    const errorMessage = 
      errorData?.details || 
      errorData?.message || 
      errorData?.error || 
      res.statusText || 
      `HTTP ${res.status} Error`;
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).code = errorData?.code;
    (error as any).details = errorData;
    (error as any).internalError = errorData?.internalError; // Include internal error in dev mode

    const traceId = res.headers.get("X-Trace-ID");
    if (traceId) {
      console.error(`[Request Failed] Trace ID: ${traceId}`);
      (error as any).traceId = traceId; // Add traceId to the error object
    }

    throw error;
  }
}

// In development, use relative URLs so Vite proxy works
// In production, use VITE_API_URL if set
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // If URL is already absolute, use it as-is
  // Otherwise, if API_BASE is set, prepend it
  // If API_BASE is empty (dev mode), use relative URL (Vite proxy will handle it)
  const fullUrl = url.startsWith("http") 
    ? url 
    : API_BASE 
      ? `${API_BASE}${url}` 
      : url; // Relative URL - Vite proxy will forward to backend
  
  // GET and HEAD requests cannot have a body
  const methodsWithoutBody = ['GET', 'HEAD'];
  const hasBody = data !== undefined && data !== null && !methodsWithoutBody.includes(method.toUpperCase());
  
  const headers: Record<string, string> = hasBody ? { "Content-Type": "application/json" } : {};
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: hasBody ? JSON.stringify(data) : undefined,
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

      const headers: Record<string, string> = {};
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(fullUrl, {
        credentials: "include",
        headers,
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

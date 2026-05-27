const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

type FetchArgs = Parameters<typeof fetch>;

type GlobalWithLogger = typeof globalThis & {
  __driverApiLoggerInstalled?: boolean;
  __driverOriginalFetch?: typeof fetch;
};

const getRequestUrl = (input: FetchArgs[0]) => {
  if (typeof input === "string") return input;

  if (input && typeof input === "object" && "url" in input) {
    return String((input as { url?: unknown }).url || "unknown-url");
  }

  return String(input);
};

const getRequestMethod = (input: FetchArgs[0], init?: FetchArgs[1]) => {
  if (init?.method) return init.method.toUpperCase();

  if (input && typeof input === "object" && "method" in input) {
    const method = (input as { method?: unknown }).method;
    if (typeof method === "string" && method.length > 0) {
      return method.toUpperCase();
    }
  }

  return "GET";
};

const installNetworkLogger = () => {
  const globalWithLogger = globalThis as GlobalWithLogger;

  if (globalWithLogger.__driverApiLoggerInstalled) return;

  globalWithLogger.__driverApiLoggerInstalled = true;
  globalWithLogger.__driverOriginalFetch = globalWithLogger.fetch;
  const originalFetch = globalWithLogger.__driverOriginalFetch;

  console.log(`[Driver API] Base URL: ${API_URL || "not configured"}`);

  globalWithLogger.fetch = (async (...args: FetchArgs) => {
    const [input, init] = args;
    const url = getRequestUrl(input);
    const method = getRequestMethod(input, init);

    console.log(`[Driver API] ${method} ${url}`);

    try {
      const response = await originalFetch(...args);
      console.log(`[Driver API] ${method} ${url} -> ${response.status}`);
      return response;
    } catch (error) {
      console.warn(`[Driver API] ${method} ${url} failed`, error);
      throw error;
    }
  }) as typeof fetch;
};

installNetworkLogger();

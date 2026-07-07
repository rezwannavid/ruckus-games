const configuredServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getServerUrl() {
  if (typeof window === "undefined") {
    return configuredServerUrl;
  }

  const pageHostname = window.location.hostname;

  try {
    const url = new URL(configuredServerUrl);

    if (isLoopbackHost(url.hostname) && !isLoopbackHost(pageHostname)) {
      url.hostname = pageHostname;
      return url.toString().replace(/\/$/, "");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredServerUrl;
  }
}

export const serverUrl = getServerUrl();

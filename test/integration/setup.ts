const TEST_PORT = 3099;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

// ---------------------------------------------------------------------------
// Cookie jar helper
// ---------------------------------------------------------------------------

export class CookieJar {
  private cookies = new Map<string, string>();

  capture(response: Response): void {
    const setCookieHeaders = response.headers.getSetCookie();
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      const eqIdx = pair.indexOf("=");
      if (eqIdx > 0) {
        const name = pair.substring(0, eqIdx).trim();
        const value = pair.substring(eqIdx + 1).trim();
        if (value === "" || header.toLowerCase().includes("max-age=0")) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, value);
        }
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  clear(): void {
    this.cookies.clear();
  }
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

export async function fetchApi(
  path: string,
  options: RequestInit = {},
  jar?: CookieJar,
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (jar) {
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
  }

  // Default origin for CSRF
  if (
    !headers.has("origin") &&
    (options.method === "POST" ||
      options.method === "PUT" ||
      options.method === "PATCH" ||
      options.method === "DELETE")
  ) {
    headers.set("origin", BASE_URL);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    redirect: "manual",
  });

  if (jar) {
    jar.capture(res);
  }

  return res;
}

const APK_URL =
  "https://expo.dev/artifacts/eas/JnJnldcXLl8xFq-lceuqVheQY5Ocx3W3Qdd2vrh9WgM.apk";
const APK_FILENAME = "Donezo-1.0.3.apk";
const ALLOWED_PATHS = new Set(["/", `/${APK_FILENAME}`]);

const forwardedRequestHeaders = [
  "range",
  "if-range",
  "if-none-match",
  "if-modified-since",
] as const;

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    if (!ALLOWED_PATHS.has(url.pathname)) {
      return textResponse("Download not found.", 404);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const upstreamHeaders = new Headers();
    for (const name of forwardedRequestHeaders) {
      const value = request.headers.get(name);
      if (value) upstreamHeaders.set(name, value);
    }

    try {
      const upstream = await fetch(APK_URL, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: "follow",
        cf: {
          cacheEverything: true,
          cacheTtl: 86_400,
        },
      });

      if (!upstream.ok && upstream.status !== 304) {
        console.error(
          JSON.stringify({
            event: "apk_upstream_error",
            status: upstream.status,
          }),
        );
        return textResponse("The Donezo download is temporarily unavailable.", 502);
      }

      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.set(
        "Content-Type",
        "application/vnd.android.package-archive",
      );
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${APK_FILENAME}"`,
      );
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=86400",
      );
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.delete("Set-Cookie");

      return new Response(request.method === "HEAD" ? null : upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "apk_proxy_error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return textResponse("The Donezo download is temporarily unavailable.", 502);
    }
  },
} satisfies ExportedHandler;

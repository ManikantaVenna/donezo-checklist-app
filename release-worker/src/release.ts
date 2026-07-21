const APK_PREFIX = "android/";
const APK_SUFFIX = ".apk";
const APK_CONTENT_TYPE = "application/vnd.android.package-archive";
const ONE_YEAR_SECONDS = 31536000;

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export function getReleaseKey(pathname: string): string | null {
  const key = pathname.replace(/^\/+/, "");
  if (!key.startsWith(APK_PREFIX) || !key.endsWith(APK_SUFFIX)) return null;
  if (!/^android\/Donezo-\d+\.\d+\.\d+-build-\d+\.apk$/.test(key)) return null;
  return key;
}

export function parseRangeHeader(value: string | null, size: number): R2Range | null | "invalid" {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return "invalid";

  const [, startText, endText] = match;
  if (!startText && !endText) return "invalid";

  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return "invalid";
    return { suffix };
  }

  const offset = Number(startText);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= size) return "invalid";

  if (!endText) return { offset };

  const end = Number(endText);
  if (!Number.isSafeInteger(end) || end < offset) return "invalid";

  return { offset, length: Math.min(end, size - 1) - offset + 1 };
}

export function rangeLength(range: R2Range, size: number): number {
  if ("suffix" in range && typeof range.suffix === "number") return Math.min(range.suffix, size);

  const offset = "offset" in range && typeof range.offset === "number" ? range.offset : 0;
  if ("length" in range && typeof range.length === "number") return Math.min(range.length, size - offset);
  return size - offset;
}

export function contentRange(range: R2Range | undefined, size: number): string | null {
  if (!range) return null;

  if ("suffix" in range && typeof range.suffix === "number") {
    const length = Math.min(range.suffix, size);
    return `bytes ${size - length}-${size - 1}/${size}`;
  }

  const offset = "offset" in range && typeof range.offset === "number" ? range.offset : 0;
  const end = "length" in range && typeof range.length === "number" ? offset + range.length - 1 : size - 1;
  return `bytes ${offset}-${Math.min(end, size - 1)}/${size}`;
}

function releaseHeaders(object: R2Object, filename: string, responseRange: R2Range | null): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", APK_CONTENT_TYPE);
  headers.set("content-disposition", `attachment; filename="${filename}"`);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");

  if (responseRange) {
    const range = contentRange(responseRange, object.size);
    if (range) headers.set("content-range", range);
  }

  headers.set("content-length", String(responseRange ? rangeLength(responseRange, object.size) : object.size));
  return headers;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Method not allowed", 405);
  }

  const url = new URL(request.url);
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const key = getReleaseKey(url.pathname);
  if (!key) return textResponse("Not found", 404);

  const head = await env.RELEASES.head(key);
  if (!head) return textResponse("Not found", 404);

  const range = parseRangeHeader(request.headers.get("range"), head.size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: {
        "content-range": `bytes */${head.size}`,
        "cache-control": "no-store",
      },
    });
  }

  const filename = key.slice(key.lastIndexOf("/") + 1);
  if (request.method === "HEAD") {
    const headers = releaseHeaders(head, filename, range);
    return new Response(null, {
      status: range ? 206 : 200,
      headers,
    });
  }

  const object = await env.RELEASES.get(key, range ? { range } : undefined);
  if (!object) return textResponse("Not found", 404);

  const headers = releaseHeaders(head, filename, range);
  return new Response(object.body, {
    status: range ? 206 : 200,
    headers,
  });
}

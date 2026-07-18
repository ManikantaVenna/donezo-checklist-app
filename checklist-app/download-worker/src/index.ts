const APK_FILENAME = "Donezo-1.0.3.apk";
const APK_SIZE = 37_562_716;
const APK_ETAG = '"52495aeb4b650713c1739b02742aaee1"';
const APK_LAST_MODIFIED = "Sat, 18 Jul 2026 15:41:17 GMT";
const APK_LAST_MODIFIED_TIME = Date.parse(APK_LAST_MODIFIED);
const ALLOWED_PATHS = new Set(["/", `/${APK_FILENAME}`]);

const APK_PARTS = [
  { path: "/_parts/donezo-1.0.3.part-001", offset: 0, length: 16_777_216 },
  {
    path: "/_parts/donezo-1.0.3.part-002",
    offset: 16_777_216,
    length: 16_777_216,
  },
  {
    path: "/_parts/donezo-1.0.3.part-003",
    offset: 33_554_432,
    length: 4_008_284,
  },
] as const;

type ByteRange = { start: number; end: number };
type RangeResult =
  | { kind: "none" }
  | { kind: "invalid" }
  | ({ kind: "valid" } & ByteRange);
type StreamFactory = () => Promise<ReadableStream<Uint8Array>>;

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

function baseHeaders(contentLength: number): Headers {
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600, no-transform",
    "Content-Disposition": `attachment; filename="${APK_FILENAME}"`,
    "Content-Length": String(contentLength),
    "Content-Type": "application/vnd.android.package-archive",
    ETag: APK_ETAG,
    "Last-Modified": APK_LAST_MODIFIED,
    "X-Content-Type-Options": "nosniff",
  });
  return headers;
}

function parseRange(value: string | null): RangeResult {
  if (!value) return { kind: "none" };
  if (value.includes(",")) return { kind: "invalid" };

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return { kind: "invalid" };

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) return { kind: "invalid" };

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: "invalid" };
    }
    return {
      kind: "valid",
      start: Math.max(0, APK_SIZE - suffixLength),
      end: APK_SIZE - 1,
    };
  }

  const start = Number(startValue);
  const requestedEnd = endValue ? Number(endValue) : APK_SIZE - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= APK_SIZE ||
    requestedEnd < start
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "valid",
    start,
    end: Math.min(requestedEnd, APK_SIZE - 1),
  };
}

function etagListMatches(value: string, allowWeak: boolean): boolean {
  return value
    .split(",")
    .map((candidate) => candidate.trim())
    .some((candidate) => {
      if (candidate === "*") return true;
      if (allowWeak) return candidate.replace(/^W\//, "") === APK_ETAG;
      return candidate === APK_ETAG;
    });
}

function preconditionResponse(request: Request): Response | null {
  const ifMatch = request.headers.get("if-match");
  if (ifMatch && !etagListMatches(ifMatch, false)) {
    return new Response(null, { status: 412 });
  }

  const ifUnmodifiedSince = request.headers.get("if-unmodified-since");
  if (!ifMatch && ifUnmodifiedSince) {
    const time = Date.parse(ifUnmodifiedSince);
    if (!Number.isNaN(time) && APK_LAST_MODIFIED_TIME > time) {
      return new Response(null, { status: 412 });
    }
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && etagListMatches(ifNoneMatch, true)) {
    const headers = baseHeaders(0);
    headers.delete("Content-Length");
    return new Response(null, { status: 304, headers });
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (!ifNoneMatch && ifModifiedSince) {
    const time = Date.parse(ifModifiedSince);
    if (!Number.isNaN(time) && APK_LAST_MODIFIED_TIME <= time) {
      const headers = baseHeaders(0);
      headers.delete("Content-Length");
      return new Response(null, { status: 304, headers });
    }
  }

  return null;
}

function ifRangeAllowsPartial(request: Request): boolean {
  const value = request.headers.get("if-range");
  if (!value) return true;
  if (value.startsWith('"') || value.startsWith("W/")) {
    return value === APK_ETAG;
  }

  const time = Date.parse(value);
  return !Number.isNaN(time) && APK_LAST_MODIFIED_TIME <= time;
}

function concatenateStreams(
  streamFactories: StreamFactory[],
): ReadableStream<Uint8Array> {
  let index = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (index < streamFactories.length) {
          if (!reader) {
            const stream = await streamFactories[index]();
            reader = stream.getReader();
          }
          const result = await reader.read();
          if (!result.done) {
            controller.enqueue(result.value);
            return;
          }

          reader.releaseLock();
          reader = null;
          index += 1;
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      if (reader) await reader.cancel(reason);
    },
  });
}

function sliceStream(
  stream: ReadableStream<Uint8Array>,
  start: number,
  endExclusive: number,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let sourceOffset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (sourceOffset < endExclusive) {
          const result = await reader.read();
          if (result.done) {
            controller.error(new Error("Asset stream ended unexpectedly"));
            return;
          }

          const chunkStart = sourceOffset;
          const chunkEnd = chunkStart + result.value.byteLength;
          sourceOffset = chunkEnd;
          if (chunkEnd <= start) continue;

          const sliceStart = Math.max(0, start - chunkStart);
          const sliceEnd = Math.min(result.value.byteLength, endExclusive - chunkStart);
          if (sliceEnd > sliceStart) {
            controller.enqueue(result.value.subarray(sliceStart, sliceEnd));
            return;
          }
        }

        await reader.cancel();
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

function assetStreamFactoriesForRange(
  request: Request,
  env: Env,
  range: ByteRange,
): StreamFactory[] {
  const relevantParts = APK_PARTS.filter((part) => {
    const partEnd = part.offset + part.length - 1;
    return range.start <= partEnd && range.end >= part.offset;
  });

  return relevantParts.map(
    (part) => async () => {
      const localStart = Math.max(range.start, part.offset) - part.offset;
      const localEnd =
        Math.min(range.end, part.offset + part.length - 1) - part.offset;
      const assetUrl = new URL(part.path, request.url);
      const response = await env.ASSETS.fetch(new Request(assetUrl));

      if (!response.ok || !response.body) {
        throw new Error(`Asset ${part.path} returned ${response.status}`);
      }

      const contentLengthHeader = response.headers.get("content-length");
      const actualLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : part.length;
      if (
        response.status !== 200 ||
        !Number.isSafeInteger(actualLength) ||
        actualLength !== part.length
      ) {
        throw new Error(
          `Asset ${part.path} returned an invalid full response`,
        );
      }

      return sliceStream(response.body, localStart, localEnd + 1);
    },
  );
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
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

    const failedPrecondition = preconditionResponse(request);
    if (failedPrecondition) return failedPrecondition;

    let parsedRange = parseRange(request.headers.get("range"));
    if (parsedRange.kind === "invalid") {
      const headers = baseHeaders(0);
      headers.set("Content-Range", `bytes */${APK_SIZE}`);
      headers.delete("Content-Length");
      return new Response(null, { status: 416, headers });
    }
    if (parsedRange.kind === "valid" && !ifRangeAllowsPartial(request)) {
      parsedRange = { kind: "none" };
    }

    const range: ByteRange =
      parsedRange.kind === "valid"
        ? parsedRange
        : { start: 0, end: APK_SIZE - 1 };
    const contentLength = range.end - range.start + 1;
    const status = parsedRange.kind === "valid" ? 206 : 200;
    const headers = baseHeaders(contentLength);
    if (status === 206) {
      headers.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${APK_SIZE}`,
      );
    }

    if (request.method === "HEAD") {
      return new Response(null, { status, headers });
    }

    try {
      const streamFactories = assetStreamFactoriesForRange(request, env, range);
      const firstStream = await streamFactories[0]();
      streamFactories[0] = () => Promise.resolve(firstStream);
      const fixedLength = new FixedLengthStream(contentLength);
      const pipePromise = concatenateStreams(streamFactories)
        .pipeTo(fixedLength.writable)
        .catch((error) => {
          console.error(
            JSON.stringify({
              event: "apk_stream_error",
              message: error instanceof Error ? error.message : "Unknown error",
              rangeStart: range.start,
              rangeEnd: range.end,
            }),
          );
        });
      ctx.waitUntil(pipePromise);
      return new Response(fixedLength.readable, { status, headers });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "apk_asset_error",
          message: error instanceof Error ? error.message : "Unknown error",
          rangeStart: range.start,
          rangeEnd: range.end,
        }),
      );
      return textResponse("The Donezo download is temporarily unavailable.", 502);
    }
  },
} satisfies ExportedHandler<Env>;

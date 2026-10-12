# Cloudflare R2 release hosting

GRMetro update artifacts are served from a Cloudflare Worker backed by the private `grmetro-updates` R2 bucket through the `UPDATES_BUCKET` binding. Direct R2 public access remains disabled. This origin hosts updater artifacts only; it never hosts or proxies the LAN dashboard, backend, phone remote, ServiceTitan session, or TV URLs.

## Staging origin

```text
https://grmetro-updates.grmetroheatingandcooling.workers.dev
```

Allowed public objects:

```text
/release.json
/release.json.sig
/grmetro-performance-center-YYYY.M.D.N.zip
/staging/release.json
/staging/release.json.sig
/staging/grmetro-performance-center-YYYY.M.D.N.zip
```

The matching native-owned staging policy is `scripts/windows/release-source.cloudflare-staging.json`. It uses the `testing` channel and contains no credential or signing key.

## Worker compatibility requirement

The updater uses GET, follows at most the configured approved-host redirects, accepts an absent `Content-Length`, and verifies the exact signed ZIP size itself. Metadata and signature bytes must be served unchanged. ZIP content encoding must not transform the stored bytes.

All four metadata paths include `Cache-Control: no-store` for successful and missing responses. Live query-free read-only probing on October 8, 2026 confirmed the absent production and staging objects return 404 with the required header.

Minimal Worker structure:

```javascript
const METADATA = new Set(["/release.json", "/release.json.sig", "/staging/release.json", "/staging/release.json.sig"]);
const VERSIONED_ZIP = /^\/(?:staging\/)?grmetro-performance-center-\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,4}\.zip$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const metadata = METADATA.has(url.pathname);
    if (!metadata && !VERSIONED_ZIP.test(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    const key = url.pathname.slice(1);
    const object = request.method === "HEAD"
      ? await env.UPDATES_BUCKET.head(key)
      : await env.UPDATES_BUCKET.get(key);

    const cacheControl = metadata
      ? "no-store"
      : "public, max-age=31536000, immutable";

    if (!object) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": cacheControl,
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer"
        }
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Length", String(object.size));
    headers.set("Cache-Control", cacheControl);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    if (!metadata) headers.set("Content-Disposition", `attachment; filename="${key}"`);

    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  }
};
```

## Manual publication order

1. Upload the immutable versioned ZIP under its exact lower-case key.
2. Verify its R2 size and SHA-256 against local signed metadata.
3. Upload `release.json.sig`.
4. Upload `release.json` last.
5. Fetch all three through the Worker and compare exact local/remote bytes and ZIP SHA-256.
6. Run Check for Updates from the designated staging PC.

Never reuse or overwrite a versioned ZIP key. A metadata/signature mismatch during publication fails safely and should resolve on the next bounded check after both files are present.

## Staging/production separation

The deployed Worker keeps the root paths for future production and uses an isolated staging prefix:

```text
Production:
/release.json
/release.json.sig
/grmetro-performance-center-YYYY.M.D.N.zip

Staging:
/staging/release.json
/staging/release.json.sig
/staging/grmetro-performance-center-YYYY.M.D.N.zip
```

Use matching R2 object keys under `staging/`. The updater already accepts these paths because trust policy restricts scheme and host while the signed metadata authenticates the complete artifact URL. No transaction or client code change is needed.

Minimal Worker routing changes:

```javascript
const METADATA = new Set([
  "/release.json",
  "/release.json.sig",
  "/staging/release.json",
  "/staging/release.json.sig"
]);

const VERSIONED_ZIP = /^\/(?:staging\/)?grmetro-performance-center-\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,4}\.zip$/;
```

The staging native policy uses the two `/staging/` metadata URLs, channel `testing`, and the channel-scoped staging key ID. Production continues to use root metadata, channel `stable`, and a separate future production key. Never upload staging metadata to the root paths.

## [Unreleased]

- Rewrite as a zero-dependency port of booqable.rb v2.1.0. The implementation
  based on `axios` and `jsonwebtoken` is replaced by one built on the global
  `fetch` and Web Crypto, so the client runs in Node.js (>= 20), browsers, and
  edge runtimes such as Cloudflare Workers. The port brings the feature set in
  line with the gem:
  - Resource proxies (`list`, `all`, `find`, `create`, `update`, `delete`) for
    every resource, including `app_issues`.
  - JSON:API (de)serialization with relationships populated from included
    resources, present-with-null relationship keys, and date parsing.
  - Auto-pagination driven by `meta.stats.total.count` and the rate limit.
  - Full typed error hierarchy, including `TokenRevoked`,
    `RefreshTokenRevoked` and `InvalidGrant`, with rate limit context on
    `TooManyRequests`.
  - API key, OAuth (60s refresh buffer, `aroundRefreshToken` hook,
    `authenticateWithCode`) and single-use JWT request signing (HS256, RS256
    and ES256 via `crypto.subtle`).
  - `parseResource` (aliased as `deserializeResource`) for parsing webhook
    payloads and raw API responses.
  - Strict attribute reads: reading an attribute absent from an API payload
    throws `MissingAttribute` instead of returning `undefined`. Opt out with
    `strictAttributes: false`.
  - Retries with exponential backoff for idempotent requests.
  - Option validation with did-you-mean suggestions, and snake_case aliases
    for every option so booqable.rb configuration carries over.
- Fix: the API endpoint is now built as `https://{company}.booqable.com/api/4`.
  The previous implementation built `https://booqable.com/v4`.
- Add the `auth` option for a custom auth strategy. It takes precedence over
  the built-in API key, OAuth and single-use methods and decorates every
  request and retry attempt, the JavaScript analog of booqable.rb's custom
  middleware support.
- Type every client option under both camelCase and snake_case spellings, plus
  the `skipRetries` alias, so mistyped values and callback signatures are
  rejected at compile time. The tests are now type checked in CI as well.
- Ship only the build output in the npm package. The TypeScript sources were
  packed alongside `dist/` but nothing resolved them.
- Prepare the package for publishing to npm under `@booqable/client` with
  public access and `sideEffects: false`.

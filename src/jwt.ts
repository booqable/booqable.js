/**
 * Minimal JWT signing on top of Web Crypto (crypto.subtle), so it works in
 * Node.js, browsers, and edge runtimes without any dependency.
 *
 * Supports the algorithms Booqable request signing accepts:
 * HS256 (HMAC), RS256 (RSA, PKCS#8 PEM), and ES256 (ECDSA P-256, PKCS#8 PEM).
 */

const encoder = new TextEncoder()

export function base64UrlEncode(data: Uint8Array): string {
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256(data: string | Uint8Array): Promise<Uint8Array> {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return new Uint8Array(digest)
}

/** Strict (padded, non-url) base64 of a SHA-256 digest, matching Ruby's Base64.strict_encode64. */
export function base64Encode(data: Uint8Array): string {
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importKey(algorithm: string, key: string): Promise<{ cryptoKey: CryptoKey; signParams: AlgorithmIdentifier | EcdsaParams }> {
  switch (algorithm) {
    case 'HS256': {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key) as BufferSource,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      return { cryptoKey, signParams: { name: 'HMAC' } }
    }
    case 'RS256': {
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToDer(key) as BufferSource,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      )
      return { cryptoKey, signParams: { name: 'RSASSA-PKCS1-v1_5' } }
    }
    case 'ES256': {
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToDer(key) as BufferSource,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      )
      return { cryptoKey, signParams: { name: 'ECDSA', hash: 'SHA-256' } }
    }
    default:
      throw new Error(`Unsupported JWT algorithm: ${algorithm}. Supported: HS256, RS256, ES256.`)
  }
}

/**
 * Signs a JWT with the given header, payload, algorithm, and key.
 *
 * RS256/ES256 keys must be PEM-encoded PKCS#8 private keys
 * (`-----BEGIN PRIVATE KEY-----`).
 */
export async function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  algorithm: string,
  key: string
): Promise<string> {
  const fullHeader = { alg: algorithm, typ: 'JWT', ...header }
  const signingInput = `${base64UrlEncode(encoder.encode(JSON.stringify(fullHeader)))}.${base64UrlEncode(
    encoder.encode(JSON.stringify(payload))
  )}`

  const { cryptoKey, signParams } = await importKey(algorithm, key)
  const signature = await crypto.subtle.sign(signParams, cryptoKey, encoder.encode(signingInput) as BufferSource)

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
}

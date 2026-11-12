export const VALID_FOR_MS = 15 * 60_000
export const FUTURE_SKEW_MS = 5 * 60_000

export type OpenResult =
  { ok: true; json: string; stampedAt: number } | { ok: false; reason: "notASave" | "tampered" | "expired" | "future" }

const MAGIC = [0x50, 0x53] // "PS"
const FORMAT = 0x01
const STAMP_AT = 3
const IV_AT = 9
const HEADER_LENGTH = IV_AT + 12
const TAG_LENGTH = 16

// The key ships inside the app, so this is tamper-evidence for ordinary
// players (an edited timestamp or payload is refused), not secrecy.
const KEY_SEED = "pyramid-scheme save card v1"

const getKey = async (): Promise<CryptoKey> => {
  const seed = new TextEncoder().encode(KEY_SEED)
  const raw = await crypto.subtle.digest("SHA-256", seed)
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"])
}

const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> => {
  const writer = stream.writable.getWriter()
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => undefined)
  writer.close().catch(() => undefined)
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

export const sealSave = async (json: string, now: number): Promise<Uint8Array> => {
  const compressed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"))

  const header = new Uint8Array(HEADER_LENGTH)
  header.set(MAGIC, 0)
  header[2] = FORMAT
  new DataView(header.buffer).setUint16(STAMP_AT, Math.floor(now / 2 ** 32))
  new DataView(header.buffer).setUint32(STAMP_AT + 2, now % 2 ** 32)
  crypto.getRandomValues(header.subarray(IV_AT))

  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: header.subarray(IV_AT),
        additionalData: header,
      },
      await getKey(),
      compressed as Uint8Array<ArrayBuffer>
    )
  )

  const out = new Uint8Array(header.length + cipher.length)
  out.set(header, 0)
  out.set(cipher, header.length)
  return out
}

export const openSave = async (bytes: Uint8Array, now: number): Promise<OpenResult> => {
  if (
    bytes.length < HEADER_LENGTH + TAG_LENGTH ||
    bytes[0] !== MAGIC[0] ||
    bytes[1] !== MAGIC[1] ||
    bytes[2] !== FORMAT
  ) {
    return { ok: false, reason: "notASave" }
  }

  const header = bytes.slice(0, HEADER_LENGTH)
  let json: string
  try {
    const compressed = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: header.subarray(IV_AT),
          additionalData: header,
        },
        await getKey(),
        bytes.slice(HEADER_LENGTH) as Uint8Array<ArrayBuffer>
      )
    )
    json = new TextDecoder().decode(await pipe(compressed, new DecompressionStream("deflate-raw")))
  } catch {
    return { ok: false, reason: "tampered" }
  }

  const view = new DataView(header.buffer)
  const stampedAt = view.getUint16(STAMP_AT) * 2 ** 32 + view.getUint32(STAMP_AT + 2)
  if (now - stampedAt > VALID_FOR_MS) return { ok: false, reason: "expired" }
  if (stampedAt - now > FUTURE_SKEW_MS) return { ok: false, reason: "future" }
  return { ok: true, json, stampedAt }
}

const CHUNK_TAG = 0x50 // "P"
const HEADER_LENGTH = 4
const MAX_CHUNK_BYTES = 2_904
const MAX_PAYLOAD = MAX_CHUNK_BYTES - HEADER_LENGTH
const MAX_CHUNKS = 9

export const splitChunks = (payload: Uint8Array, transferId: number): Uint8Array[] => {
  const count = Math.max(1, Math.ceil(payload.length / MAX_PAYLOAD))
  if (count > MAX_CHUNKS) {
    throw new Error(`Payload needs ${count} chunks, at most ${MAX_CHUNKS}`)
  }
  return Array.from({ length: count }, (_, index) => {
    const part = payload.subarray(index * MAX_PAYLOAD, (index + 1) * MAX_PAYLOAD)
    const chunk = new Uint8Array(HEADER_LENGTH + part.length)
    chunk[0] = CHUNK_TAG
    chunk[1] = (transferId >> 8) & 0xff
    chunk[2] = transferId & 0xff
    chunk[3] = (index << 4) | count
    chunk.set(part, HEADER_LENGTH)
    return chunk
  })
}

/** Number of chunks a chunk says its card holds, or undefined when it is not a chunk. */
export const chunkCount = (chunk: Uint8Array): number | undefined =>
  chunk.length >= HEADER_LENGTH && chunk[0] === CHUNK_TAG ? chunk[3] & 0x0f : undefined

export const joinChunks = (chunks: Uint8Array[]): Uint8Array | undefined => {
  if (chunks.length === 0) return undefined
  if (chunks.some(chunk => chunkCount(chunk) === undefined)) return undefined
  const count = chunks[0][3] & 0x0f
  const id = (chunks[0][1] << 8) | chunks[0][2]
  if (chunks.length !== count) return undefined

  const byIndex = new Map<number, Uint8Array>()
  for (const chunk of chunks) {
    if (((chunk[1] << 8) | chunk[2]) !== id || (chunk[3] & 0x0f) !== count) {
      return undefined
    }
    const index = chunk[3] >> 4
    if (index >= count || byIndex.has(index)) return undefined
    byIndex.set(index, chunk.subarray(HEADER_LENGTH))
  }

  const parts = Array.from({ length: count }, (_, index) => byIndex.get(index)!)
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

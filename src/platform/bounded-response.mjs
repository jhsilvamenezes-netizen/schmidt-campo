// Leitura incremental: o limite vale durante a transferência, não só após blob().
export async function readSchmidtBoundedResponse(response, {limit, signal} = {}) {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError('Limite inválido');
  const checkAbort = () => { if (signal?.aborted) throw signal.reason || new DOMException('Cancelado', 'AbortError'); };
  checkAbort();
  const declared = response.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > limit) {
    await response.body?.cancel().catch(() => {});
    throw new RangeError('Resposta grande demais');
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader(), chunks = [];
  let total = 0, complete = false;
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, {once:true});
  try {
    checkAbort();
    while (true) {
      const {done, value} = await reader.read();
      checkAbort();
      if (done) { complete = true; break; }
      total += value.byteLength;
      if (total > limit) throw new RangeError('Resposta grande demais');
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// Checar dimensões antes de pedir a decodificação evita imagens comprimidas
// pequenas que exigiriam uma área desproporcional de memória ao serem abertas.
export function schmidtRasterDimensions(bytes, mime, maxSide = 2048) {
  const invalid = () => { throw new Error('Cabeçalho de imagem inválido'); };
  const valid = (width, height) => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > maxSide || height > maxSide) invalid();
    return {width, height};
  };
  const type = mime.split(';')[0].trim().toLowerCase();
  if (type === 'image/png') {
    if (bytes.length < 24 || ![137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) invalid();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(8) !== 13 || ![73,72,68,82].every((v,i) => bytes[12+i] === v)) invalid();
    return valid(view.getUint32(16), view.getUint32(20));
  }
  if (type !== 'image/jpeg' || bytes[0] !== 255 || bytes[1] !== 216) invalid();
  const sof = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 255) invalid();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) invalid();
    const size = bytes[offset] * 256 + bytes[offset+1];
    if (size < 2 || offset + size > bytes.length) invalid();
    if (sof.has(marker)) {
      if (size < 8) invalid();
      return valid(bytes[offset+5]*256+bytes[offset+6], bytes[offset+3]*256+bytes[offset+4]);
    }
    offset += size;
  }
  invalid();
}

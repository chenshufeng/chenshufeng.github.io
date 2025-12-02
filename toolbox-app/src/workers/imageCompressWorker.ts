self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  if (!msg || msg.type !== 'compress') return
  try {
    const { buffer, mime, quality, maxWidth, maxHeight } = msg.payload as { buffer: ArrayBuffer; mime: string; quality: number; maxWidth: number | null; maxHeight: number | null }
    const blob = new Blob([buffer])
    const bmp = await createImageBitmap(blob)
    ;(self as any).postMessage({ type: 'progress', value: 30 })
    const dims = getTargetDims(bmp.width, bmp.height, maxWidth, maxHeight)
    const canvas = new OffscreenCanvas(dims.w, dims.h)
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    ctx.drawImage(bmp, 0, 0, dims.w, dims.h)
    ;(self as any).postMessage({ type: 'progress', value: 70 })
    const out = await canvas.convertToBlob({ type: mime, quality })
    const outBuf = await out.arrayBuffer()
    ;(self as any).postMessage({ type: 'done', payload: { buffer: outBuf, width: dims.w, height: dims.h, newSize: out.size } }, [outBuf])
  } catch (err: any) {
    ;(self as any).postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
  }
}

const getTargetDims = (w: number, h: number, mw: number | null, mh: number | null) => {
  if (!mw && !mh) return { w, h }
  const rw = mw ? mw / w : 1
  const rh = mh ? mh / h : 1
  const r = Math.min(rw, rh)
  if (r >= 1) return { w, h }
  return { w: Math.floor(w * r), h: Math.floor(h * r) }
}

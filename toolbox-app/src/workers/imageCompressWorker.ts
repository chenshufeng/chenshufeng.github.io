import UPNG from 'upng-js';

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  if (!msg || msg.type !== 'compress') return
  try {
    const { buffer, mime, quality, maxWidth, maxHeight } = msg.payload as { buffer: ArrayBuffer; mime: string; quality: number; maxWidth: number | null; maxHeight: number | null }
    
    // 对于PNG格式图片，使用UPNG.js进行压缩
    if (mime === 'image/png') {
      try {
        ;(self as any).postMessage({ type: 'progress', value: 20 })
        
        // 解码PNG
        const img = UPNG.decode(buffer);
        ;(self as any).postMessage({ type: 'progress', value: 40 })
        
        // 获取原始尺寸
        const origWidth = img.width;
        const origHeight = img.height;
        const dims = getTargetDims(origWidth, origHeight, maxWidth, maxHeight);
        
        // 如果需要调整尺寸，先转换为RGBA8
        let rgbaData: ArrayBuffer;
        if (dims.w !== origWidth || dims.h !== origHeight) {
          ;(self as any).postMessage({ type: 'progress', value: 50 })
          // 转换为RGBA8格式
          const rgba8Array = UPNG.toRGBA8(img);
          const rgba = rgba8Array?.[0] as ArrayBuffer;
          if (!rgba) {
            throw new Error('Failed to convert PNG to RGBA8 format');
          }
          const imgBlob = new Blob([rgba], { type: 'image/png' });
          const bmp = await createImageBitmap(imgBlob);
          
          // 创建调整大小的画布
          const canvas = new OffscreenCanvas(dims.w, dims.h);
          const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
          ctx.drawImage(bmp, 0, 0, dims.w, dims.h);
          
          // 获取调整大小后的像素数据
          const imageData = ctx.getImageData(0, 0, dims.w, dims.h);
          rgbaData = imageData.data.buffer;
        } else {
          // 直接使用原始数据
          const rgba8Array = UPNG.toRGBA8(img);
          rgbaData = rgba8Array?.[0] as ArrayBuffer;
          if (!rgbaData) {
            throw new Error('Failed to get RGBA8 data from PNG');
          }
        }
        
        ;(self as any).postMessage({ type: 'progress', value: 80 })
        
        // 根据quality决定是否使用有损压缩
        // quality为1.0使用无损压缩，否则使用有损压缩（颜色数越少压缩率越高）
        const colorNum = quality >= 1.0 ? 0 : Math.max(2, Math.floor(256 * quality));
        
        // 使用UPNG编码
        const encoded = UPNG.encode([rgbaData], dims.w, dims.h, colorNum);
        
        ;(self as any).postMessage({ type: 'progress', value: 95 })
        
        ;(self as any).postMessage({ 
          type: 'done', 
          payload: { 
            buffer: encoded, 
            width: dims.w, 
            height: dims.h, 
            newSize: encoded.byteLength 
          } 
        }, [encoded])
      } catch (upngErr) {
        // 如果UPNG.js压缩失败，回退到传统方法
        console.warn('UPNG.js compression failed, falling back to canvas method:', upngErr);
        await fallbackCompression(buffer, mime, quality, maxWidth, maxHeight);
      }
    } else {
      // 非PNG格式使用传统压缩方法
      await fallbackCompression(buffer, mime, quality, maxWidth, maxHeight);
    }
  } catch (err: any) {
    ;(self as any).postMessage({ type: 'error', error: String(err && err.message ? err.message : err) })
  }
};

// 传统压缩方法作为回退
async function fallbackCompression(buffer: ArrayBuffer, mime: string, quality: number, maxWidth: number | null, maxHeight: number | null) {
  const blob = new Blob([buffer]);
  const bmp = await createImageBitmap(blob);
  ;(self as any).postMessage({ type: 'progress', value: 30 });
  const dims = getTargetDims(bmp.width, bmp.height, maxWidth, maxHeight);
  const canvas = new OffscreenCanvas(dims.w, dims.h);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bmp, 0, 0, dims.w, dims.h);
  ;(self as any).postMessage({ type: 'progress', value: 70 });
  const out = await canvas.convertToBlob({ type: mime, quality });
  const outBuf = await out.arrayBuffer();
  ;(self as any).postMessage({ 
    type: 'done', 
    payload: { 
      buffer: outBuf, 
      width: dims.w, 
      height: dims.h, 
      newSize: out.size 
    } 
  }, [outBuf]);
}

const getTargetDims = (w: number, h: number, mw: number | null, mh: number | null) => {
  if (!mw && !mh) return { w, h }
  const rw = mw ? mw / w : 1
  const rh = mh ? mh / h : 1
  const r = Math.min(rw, rh)
  if (r >= 1) return { w, h }
  return { w: Math.floor(w * r), h: Math.floor(h * r) }
}

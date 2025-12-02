<template>
  <main class="compress">
    <div class="container">
      <h1>图片压缩</h1>
      <div class="upload-area" @dragover.prevent @drop.prevent="onDrop">
        <input ref="fileInput" type="file" accept="image/*" @change="onFileChange" />
        <button class="btn" @click="chooseFile">选择图片</button>
        <p class="hint">拖拽图片到此或点击选择</p>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
      <div v-if="originalUrl" class="preview">
        <div class="preview-item">
          <h3>原始</h3>
          <img :src="originalUrl" alt="original" />
          <div class="meta">
            <span>尺寸：{{ originalWidth }}×{{ originalHeight }}</span>
            <span>大小：{{ formatBytes(originalSize) }}</span>
          </div>
        </div>
        <div class="preview-item" v-if="compressedUrl">
          <h3>压缩后</h3>
          <img :src="compressedUrl" alt="compressed" />
          <div class="meta">
            <span>尺寸：{{ compressedWidth }}×{{ compressedHeight }}</span>
            <span>大小：{{ formatBytes(compressedSize) }}</span>
            <span>压缩率：{{ compressionRate }}</span>
          </div>
        </div>
      </div>
      <div class="controls" v-if="originalUrl">
        <div class="control">
          <label>质量</label>
          <input type="range" min="0.6" max="0.9" step="0.01" v-model.number="quality" />
          <span>{{ Math.round(quality * 100) }}%</span>
        </div>
        <div class="control">
          <label>最大宽度</label>
          <input type="number" min="1" v-model.number="maxWidth" placeholder="不设保留原始" />
        </div>
        <div class="control">
          <label>最大高度</label>
          <input type="number" min="1" v-model.number="maxHeight" placeholder="不设保留原始" />
        </div>
        <div class="control">
          <label>格式</label>
          <select v-model="targetFormat">
            <option value="auto">自动</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WEBP</option>
          </select>
        </div>
        <div class="control">
          <label>文件名</label>
          <input type="text" v-model="filename" placeholder="下载文件名" />
        </div>
      </div>
      <div class="actions" v-if="originalUrl">
        <button class="btn primary" :disabled="loading" @click="startCompress">开始压缩</button>
        <button class="btn" :disabled="!compressedBlob" @click="download">下载</button>
      </div>
      <div class="progress" v-if="loading">
        <div class="bar" :style="{ width: progress + '%' }"></div>
        <span>{{ progress }}%</span>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const fileInput = ref<HTMLInputElement | null>(null)
const originalFile = ref<File | null>(null)
const originalUrl = ref<string>('')
const originalSize = ref<number>(0)
const originalWidth = ref<number>(0)
const originalHeight = ref<number>(0)
const compressedBlob = ref<Blob | null>(null)
const compressedUrl = ref<string>('')
const compressedSize = ref<number>(0)
const compressedWidth = ref<number>(0)
const compressedHeight = ref<number>(0)
const quality = ref<number>(0.8)
const maxWidth = ref<number | null>(null)
const maxHeight = ref<number | null>(null)
const targetFormat = ref<string>('auto')
const filename = ref<string>('compressed')
const loading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

const chooseFile = () => fileInput.value?.click()

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (file) await setOriginalFile(file)
}

const onDrop = async (e: DragEvent) => {
  const file = e.dataTransfer?.files?.[0]
  if (file) await setOriginalFile(file)
}

const setOriginalFile = async (file: File) => {
  error.value = null
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    error.value = '不支持的图片格式'
    return
  }
  const limit = 20 * 1024 * 1024
  if (file.size > limit) {
    error.value = '文件过大，限制20MB'
    return
  }
  originalFile.value = file
  originalUrl.value = URL.createObjectURL(file)
  originalSize.value = file.size
  const img = new Image()
  img.src = originalUrl.value
  await new Promise<void>(resolve => {
    img.onload = () => {
      originalWidth.value = img.naturalWidth
      originalHeight.value = img.naturalHeight
      resolve()
    }
  })
  compressedBlob.value = null
  compressedUrl.value = ''
  compressedSize.value = 0
}

const startCompress = async () => {
  if (!originalFile.value) return
  loading.value = true
  progress.value = 0
  compressedBlob.value = null
  compressedUrl.value = ''
  try {
    const fmt = targetFormat.value === 'auto' ? originalFile.value.type : targetFormat.value
    const workerSupported = typeof Worker !== 'undefined'
    if (workerSupported) {
      await compressWithWorker(originalFile.value, fmt)
    } else {
      await compressInMain(originalFile.value, fmt)
    }
  } catch (e: any) {
    error.value = '压缩失败'
  } finally {
    loading.value = false
    progress.value = 100
  }
}

const compressWithWorker = async (file: File, mime: string) => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(new URL('@/workers/imageCompressWorker.ts', import.meta.url), { type: 'module' })
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      worker.postMessage({ type: 'compress', payload: { buffer, mime, quality: quality.value, maxWidth: maxWidth.value, maxHeight: maxHeight.value } }, [buffer])
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
    worker.onmessage = e => {
      const msg = e.data
      if (msg.type === 'progress') {
        progress.value = Math.min(99, Math.max(0, Math.round(msg.value)))
      } else if (msg.type === 'done') {
        const buf: ArrayBuffer = msg.payload.buffer
        const blob = new Blob([buf], { type: mime })
        compressedBlob.value = blob
        compressedUrl.value = URL.createObjectURL(blob)
        compressedSize.value = msg.payload.newSize
        compressedWidth.value = msg.payload.width
        compressedHeight.value = msg.payload.height
        resolve()
        worker.terminate()
      } else if (msg.type === 'error') {
        reject(new Error(msg.error || '压缩失败'))
        worker.terminate()
      }
    }
    worker.onerror = () => {
      worker.terminate()
      reject(new Error('Worker错误'))
    }
  })
}

const compressInMain = async (file: File, mime: string) => {
  const img = await readImage(file)
  const dims = getTargetDims(img.naturalWidth, img.naturalHeight, maxWidth.value, maxHeight.value)
  const canvas = document.createElement('canvas')
  canvas.width = dims.w
  canvas.height = dims.h
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.drawImage(img, 0, 0, dims.w, dims.h)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, quality.value))
  if (!blob) throw new Error('生成图片失败')
  compressedBlob.value = blob
  compressedUrl.value = URL.createObjectURL(blob)
  compressedSize.value = blob.size
  compressedWidth.value = dims.w
  compressedHeight.value = dims.h
}

const readImage = (file: File) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

const getTargetDims = (w: number, h: number, mw: number | null, mh: number | null) => {
  if (!mw && !mh) return { w, h }
  const rw = mw ? mw / w : 1
  const rh = mh ? mh / h : 1
  const r = Math.min(rw, rh)
  if (r >= 1) return { w, h }
  return { w: Math.floor(w * r), h: Math.floor(h * r) }
}

const formatBytes = (n: number) => {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(2)} ${u[i]}`
}

const compressionRate = computed(() => {
  if (!originalSize.value || !compressedSize.value) return '—'
  const rate = 100 - (compressedSize.value / originalSize.value) * 100
  return `${rate.toFixed(1)}%`
})

watch([() => originalFile.value, () => targetFormat.value], () => {
  const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const orig = originalFile.value?.name || 'image'
  const base = orig.replace(/\.[^.]+$/, '')
  const fmt = targetFormat.value === 'auto' ? (originalFile.value?.type || 'image/jpeg') : targetFormat.value
  const ext = extMap[fmt] || 'jpg'
  filename.value = `${base}-compressed.${ext}`
})

const download = () => {
  if (!compressedBlob.value) return
  const a = document.createElement('a')
  a.href = compressedUrl.value
  a.download = filename.value
  a.click()
}
</script>

<style scoped lang="scss">
.compress {
  padding: 48px 0;
}
.upload-area {
  background-color: $bg-secondary;
  padding: 24px;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  gap: 12px;
}
.upload-area .hint {
  color: $text-secondary;
}
.error {
  color: red;
}
.preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 24px;
}
.preview-item img {
  width: 100%;
  border-radius: $border-radius;
  background-color: $bg-secondary;
}
.preview-item .meta {
  display: flex;
  gap: 12px;
  color: $text-secondary;
}
.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 24px;
}
.control {
  display: flex;
  align-items: center;
  gap: 12px;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.progress {
  height: 8px;
  background-color: $bg-secondary;
  border-radius: 999px;
  position: relative;
  margin-top: 16px;
}
.progress .bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: $primary-color;
  border-radius: 999px;
}
</style>

<template>
  <main class="compress">
    <div class="container">
      <h1 class="title">压缩工具</h1>
      <el-tabs v-model="activeTab" type="card" class="compress-tabs">
        <el-tab-pane label="图片压缩" name="image">
      <transition name="fade" mode="out-in">
      <section v-if="activeTab === 'image'" class="surface upload-area" aria-label="上传图片区域">
        <el-upload
          class="el-upload-apple"
          :show-file-list="false"
          drag
          accept="image/*"
          :auto-upload="false"
          multiple
          :limit="100"
          :before-upload="handleBeforeUpload"
          @change="handleUploadChange"
        >
          <el-icon><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18h14v2H5z"/></svg></el-icon>
          <div class="el-upload__text">拖拽图片到此或点击选择</div>
        </el-upload>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </section>
      </transition>

      
      <div v-if="activeTab === 'image' && originalUrl && imageFiles.length === 0" class="preview">
        <div class="preview-item">
          <h3>原始</h3>
          <img :src="originalUrl" alt="原始图片" />
          <div class="meta">
            <span>尺寸：{{ originalWidth }}×{{ originalHeight }}</span>
            <span>大小：{{ formatBytes(originalSize) }}</span>
          </div>
        </div>
        <div class="preview-item" v-if="compressedUrl">
          <h3>压缩后</h3>
          <img :src="compressedUrl" alt="压缩后图片" />
          <div class="meta">
            <span>尺寸：{{ compressedWidth }}×{{ compressedHeight }}</span>
            <span>大小：{{ formatBytes(compressedSize) }}</span>
            <span>压缩率：{{ compressionRate }}</span>
          </div>
        </div>
      </div>
      
      
      <section v-if="activeTab === 'image' && imageFiles.length > 0" class="surface image-batch" aria-label="多图压缩">
        <div class="batch-header">
          <div class="header-title">
            <el-icon><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18h14v2H5z"/></svg></el-icon>
            <div class="texts">
              <h2 class="section-title">多图压缩</h2>
              <p class="section-sub">已选择 {{ imageTotal }} 张图片</p>
            </div>
          </div>
          <div class="header-actions">
            <el-button type="primary" :disabled="imageRunning || imageFiles.length === 0" @click="startCompressAll">压缩全部</el-button>
            <el-button :disabled="imageRunning || imageResults.length === 0" @click="downloadAllImages">批量下载</el-button>
            <el-button type="success" :disabled="imageRunning || imageResults.length === 0" @click="saveImagesDefaultBatch">保存到输出文件夹</el-button>
            <el-button type="danger" :disabled="imageRunning || imageFiles.length === 0" @click="clearAllImages">清空选择</el-button>
          </div>
        </div>
        <el-progress v-if="imageTotal > 0" :percentage="imagePercent" :status="imagePercent === 100 ? 'success' : undefined" />
        <div class="image-grid">
          <div class="image-card" v-for="(it, i) in imageFiles" :key="i">
            <el-button class="remove-btn" size="small" @click.stop="removeImageAt(i)" aria-label="移除图片">
              <el-icon><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></el-icon>
            </el-button>
            <el-button class="detail-btn" size="small" @click.stop="openDetail(i)" aria-label="查看详情">
              详情
            </el-button>
            <img :src="it.url" :alt="it.name" />
            <div class="meta"><span>{{ it.name }}</span></div>
          </div>
        </div>
        <el-dialog v-model="detailVisible" width="640" :title="detailTitle" align-center center class="detail-dialog">
          <div class="detail-content" v-if="detailLoading">计算中…</div>
          <div class="detail-content" v-else>
            <div class="detail-left" v-if="detailItem">
              <img :src="detailItem.url" :alt="detailItem.name" class="detail-thumb" />
            </div>
            <div class="detail-right">
              <div class="detail-row"><span>文件名</span><b>{{ detailStats.name }}</b></div>
              <div class="detail-row"><span>原尺寸</span><b>{{ detailStats.width }} × {{ detailStats.height }}</b></div>
              <div class="detail-row"><span>原大小</span><b>{{ formatBytes(detailStats.size) }}</b></div>
              <div class="detail-row"><span>目标尺寸</span><b>{{ detailStats.targetW }} × {{ detailStats.targetH }}</b></div>
              <div class="detail-row"><span>目标格式</span><b>{{ detailStats.fmtLabel }}</b></div>
              <div class="detail-row"><span>预估大小</span><b>{{ formatBytes(detailStats.estSize) }}</b></div>
              <div class="detail-row"><span>预估压缩率</span><b>{{ detailStats.estRate }}</b></div>
            </div>
          </div>
          <template #footer>
            <el-button @click="detailVisible = false">关闭</el-button>
          </template>
        </el-dialog>
      </section>
      <div class="progress" v-if="activeTab === 'image' && loading" role="progressbar" aria-valuemin="0" :aria-valuenow="progress" aria-valuemax="100">
        <div class="bar" :style="{ width: progress + '%' }"></div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
        </el-tab-pane>
        <el-tab-pane label="文件夹压缩" name="folder">
      <transition name="fade" mode="out-in">
      <section v-if="activeTab === 'folder'" class="surface batch-area" aria-label="文件夹压缩区域">
        <div class="control-bar">
          <div class="batch-header">
            <div class="header-title">
              <el-icon><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3 13h2v-2H3v2zm4 0h2v-2H7v2zm4 0h10v-2H11v2zM3 17h2v-2H3v2zm4 0h2v-2H7v2zm4 0h10v-2H11v2zM3 9h2V7H3v2zm4 0h2V7H7v2zm4 0h10V7H11v2z"/></svg></el-icon>
              <div class="texts">
                <h2 class="section-title">文件夹压缩</h2>
                <p class="section-sub">选择或拖拽文件夹，保持原有目录结构打包</p>
              </div>
            </div>
            
          </div>
          <div class="batch-controls">
            <el-button @click="pickZipDirectory">选择文件夹</el-button>
            <el-button @click="pickOutputDirectory">选择输出文件夹（可选）</el-button>
            <el-button type="primary" :disabled="zipFileList.length === 0 || zipRunning" @click="startZip">开始打包</el-button>
            <el-button :disabled="!zipBlob" @click="downloadZip">下载ZIP</el-button>
            <el-button type="success" :disabled="!outputDirHandle || !zipBlob" @click="saveZipToOutput">保存到输出文件夹</el-button>
          </div>
          <div class="batch-stats">
            <el-tag type="info">待处理文件：{{ zipTotal }}</el-tag>
            <el-tag type="success">已添加：{{ zipAdded }}</el-tag>
            <el-tag type="danger">失败：{{ zipFailed }}</el-tag>
          </div>
          <el-progress v-if="zipTotal > 0" :percentage="zipPercent" :status="zipPercent === 100 ? 'success' : undefined" />
        </div>
        <el-divider></el-divider>
        <div class="dropzone" :class="{ active: dropActive }" @dragover.prevent="onZipDragOver" @dragleave.prevent="onZipDragLeave" @drop.prevent="onZipDrop" aria-label="拖拽区域">
          <el-icon><svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18h14v2H5z"/></svg></el-icon>
          <div class="text">拖拽文件夹到此处或使用上方按钮</div>
        </div>
        <div v-if="zipErrors.length" class="error-list">
          <div class="error-item" v-for="(e, i) in zipErrors" :key="i">{{ e.path }} - {{ e.reason }}</div>
        </div>
      </section>
      </transition>
        </el-tab-pane>
      </el-tabs>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import JSZip from 'jszip'
import type { UploadFile } from 'element-plus'
const activeTab = ref<'image' | 'folder'>('image')
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
const outputSuffix = ref<string>('_output')
const loading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

const outputDirHandle = ref<any>(null)

const imageFiles = ref<Array<{ file: File; name: string; url: string }>>([])
const imageFileKeys = ref<Set<string>>(new Set())
const imageResults = ref<Array<{ name: string; blob: Blob }>>([])
const imageErrors = ref<Array<{ name: string; reason: string }>>([])
const imageTotal = computed(() => imageFiles.value.length)
const imageDone = ref(0)
const imageFailed = ref(0)
const imageRunning = ref(false)
const imagePercent = computed(() => {
  if (!imageTotal.value) return 0
  return Math.min(100, Math.round((imageDone.value / imageTotal.value) * 100))
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailItem = ref<{ file: File; name: string; url: string } | null>(null)
const detailTitle = computed(() => detailItem.value ? `图片详情 - ${detailItem.value.name}` : '图片详情')
const detailStats = ref<{ name: string; width: number; height: number; size: number; targetW: number; targetH: number; estSize: number; estRate: string; fmtLabel: string }>({
  name: '', width: 0, height: 0, size: 0, targetW: 0, targetH: 0, estSize: 0, estRate: '—', fmtLabel: '自动'
})

const openDetail = async (index: number) => {
  const it = imageFiles.value[index]
  if (!it) return
  detailItem.value = it
  detailVisible.value = true
  detailLoading.value = true
  try {
    await computeDetailStats(it)
  } finally {
    detailLoading.value = false
  }
}


const computeDetailStats = async (it: { file: File; name: string; url: string }) => {
  const img = await readImage(it.file)
  const dims = getTargetDims(img.naturalWidth, img.naturalHeight, maxWidth.value, maxHeight.value)
  const chosenFmt = targetFormat.value === 'auto' ? it.file.type : targetFormat.value
  const supportedCanvasFmt = /^(image\/(jpeg|png|webp))$/i
  const mime = supportedCanvasFmt.test(chosenFmt) ? chosenFmt : 'image/jpeg'
  const fmtLabelMap: Record<string, string> = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP' }
  const canvas = document.createElement('canvas')
  canvas.width = dims.w
  canvas.height = dims.h
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.drawImage(img, 0, 0, dims.w, dims.h)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, quality.value))
  let estSize = 0
  if (blob) estSize = blob.size
  const origSize = it.file.size
  const rate = origSize ? (100 - (estSize / origSize) * 100) : 0
  detailStats.value = {
    name: it.name,
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: origSize,
    targetW: dims.w,
    targetH: dims.h,
    estSize,
    estRate: `${rate.toFixed(1)}%`,
    fmtLabel: fmtLabelMap[mime] || '—'
  }
}


const handleBeforeUpload = async (file: File) => {
  await setOriginalFile(file)
  return false
}

const handleUploadChange = async (file: UploadFile) => {
  if (file && file.raw) {
    addImageFileIfSupported(file.raw as File)
    if (!originalFile.value) await setOriginalFile(file.raw as File)
  }
}

const addImageFileIfSupported = (file: File) => {
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
    imageErrors.value.push({ name: file.name, reason: '不支持的图片格式' })
    return
  }
  const key = `${file.name}:${file.size}:${file.lastModified}`
  if (imageFileKeys.value.has(key)) return
  imageFileKeys.value.add(key)
  const url = URL.createObjectURL(file)
  imageFiles.value.push({ file, name: file.name, url })
}

const startCompressAll = async () => {
  if (imageFiles.value.length === 0) return
  imageRunning.value = true
  imageDone.value = 0
  imageFailed.value = 0
  imageResults.value = []
  imageErrors.value = []
  for (const it of imageFiles.value) {
    try {
      const fmt = targetFormat.value === 'auto' ? it.file.type : targetFormat.value
      const res = await compressFile(it.file, fmt)
      imageResults.value.push({ name: deriveFileName(it.name, fmt), blob: res.blob })
      imageDone.value += 1
    } catch (e: any) {
      imageFailed.value += 1
      imageErrors.value.push({ name: it.name, reason: '压缩失败' })
    }
  }
  imageRunning.value = false
}

const downloadAllImages = () => {
  for (const r of imageResults.value) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(r.blob)
    a.download = r.name
    a.click()
  }
}

const saveImagesDefaultBatch = async () => {
  if (!outputDirHandle.value) {
    downloadAllImages()
    return
  }
  for (const r of imageResults.value) {
    try {
      const fh = await outputDirHandle.value.getFileHandle(r.name, { create: true })
      const ws = await fh.createWritable()
      await ws.write(r.blob)
      await ws.close()
    } catch (e) {
      imageErrors.value.push({ name: r.name, reason: '写入失败' })
    }
  }
}

const deriveFileName = (orig: string, _mime: string) => {
  const base = orig.replace(/\.[^.]+$/, '')
  const ext = orig.split('.').pop() || 'jpg'
  return `${base}.${ext}`
}

const removeImageAt = (index: number) => {
  const it = imageFiles.value[index]
  if (!it) return
  try {
    URL.revokeObjectURL(it.url)
  } catch {}
  const key = `${it.name}:${it.file.size}:${it.file.lastModified}`
  imageFileKeys.value.delete(key)
  imageFiles.value.splice(index, 1)
  if (imageFiles.value.length === 0) {
    imageResults.value = []
    imageErrors.value = []
    imageDone.value = 0
    imageFailed.value = 0
    imageRunning.value = false
    try {
      if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
    } catch {}
    originalFile.value = null
    originalUrl.value = ''
    originalSize.value = 0
    originalWidth.value = 0
    originalHeight.value = 0
    compressedBlob.value = null
    compressedUrl.value = ''
    compressedSize.value = 0
  }
}

const clearAllImages = () => {
  for (const it of imageFiles.value) {
    try { URL.revokeObjectURL(it.url) } catch {}
  }
  imageFiles.value = []
  imageFileKeys.value = new Set()
  imageResults.value = []
  imageErrors.value = []
  imageDone.value = 0
  imageFailed.value = 0
  imageRunning.value = false
  try {
    if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  } catch {}
  originalFile.value = null
  originalUrl.value = ''
  originalSize.value = 0
  originalWidth.value = 0
  originalHeight.value = 0
  compressedBlob.value = null
  compressedUrl.value = ''
  compressedSize.value = 0
}

const setOriginalFile = async (file: File) => {
  error.value = null
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
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





const pickOutputDirectory = async () => {
  try {
    const dir = await (window as any).showDirectoryPicker()
    outputDirHandle.value = dir
  } catch (e: any) {
    error.value = '无法选择输出文件夹'
  }
}







const compressFile = async (file: File, mime: string) => {
  try {
    const workerSupported = typeof Worker !== 'undefined'
    if (workerSupported) {
      const origSize = file.size
      // 获取原图尺寸用于必要的回退
      let origW = 0, origH = 0
      try {
        const baseImg = await readImage(file)
        origW = baseImg.naturalWidth
        origH = baseImg.naturalHeight
      } catch {}
      const res = await new Promise<{ blob: Blob; width: number; height: number; size: number }>((resolve, reject) => {
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
          if (msg.type === 'done') {
            const buf: ArrayBuffer = msg.payload.buffer
            const blob = new Blob([buf], { type: mime })
            const newSize = msg.payload.newSize || blob.size
            if (newSize >= origSize) {
              resolve({ blob: file, width: origW || msg.payload.width, height: origH || msg.payload.height, size: origSize })
            } else {
              resolve({ blob, width: msg.payload.width, height: msg.payload.height, size: newSize })
            }
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
      return res
    } else {
      const img = await readImage(file)
      const dims = getTargetDims(img.naturalWidth, img.naturalHeight, maxWidth.value, maxHeight.value)
      const canvas = document.createElement('canvas')
      canvas.width = dims.w
      canvas.height = dims.h
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      ctx.drawImage(img, 0, 0, dims.w, dims.h)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, quality.value))
      if (!blob) throw new Error('生成图片失败')
      if (blob.size >= file.size) {
        return { blob: file, width: img.naturalWidth, height: img.naturalHeight, size: file.size }
      }
      return { blob, width: dims.w, height: dims.h, size: blob.size }
    }
  } catch (err: any) {
    throw err
  }
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
  const orig = originalFile.value?.name || 'image.jpg'
  const base = orig.replace(/\.[^.]+$/, '')
  const ext = orig.split('.').pop() || 'jpg'
  filename.value = `${base}.${ext}`
})





// Folder zip states
const zip = ref<JSZip | null>(null)
const zipFileList = ref<Array<{ path: string; file: File }>>([])
const zipTotal = ref(0)
const zipAdded = ref(0)
const zipFailed = ref(0)
const zipErrors = ref<Array<{ path: string; reason: string }>>([])
const zipBlob = ref<Blob | null>(null)
const zipRunning = ref(false)
const zipLevel = ref(6)
const zipPercent = ref(0)
const zipName = ref('archive.zip')
const zipSourceDirHandle = ref<any>(null)
const dropActive = ref(false)
const zipOptimizeImages = ref(true)
const zipImageQuality = ref(0.8)

// Folder zip helpers
const pickZipDirectory = async () => {
  try {
    const dir = await (window as any).showDirectoryPicker()
    zipSourceDirHandle.value = dir
    zipFileList.value = []
    await collectZipFiles(dir)
    zipTotal.value = zipFileList.value.length
    zipAdded.value = 0
    zipFailed.value = 0
    zipErrors.value = []
    zipBlob.value = null
  } catch (e: any) {
    error.value = '无法访问文件夹'
  }
}

const onZipDrop = async (e: DragEvent) => {
  try {
    const items = e.dataTransfer?.items as any
    zipFileList.value = []
    if (items && items.length) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const entry = (it as any).webkitGetAsEntry?.() || null
        if (entry) await traverseZipEntry(entry, '')
      }
    }
    zipTotal.value = zipFileList.value.length
    zipAdded.value = 0
    zipFailed.value = 0
    zipErrors.value = []
    zipBlob.value = null
  } catch {
    error.value = '拖拽文件夹失败'
  }
  dropActive.value = false
}

const onZipDragOver = () => {
  dropActive.value = true
}

const onZipDragLeave = () => {
  dropActive.value = false
}

const traverseZipEntry = async (entry: any, base: string): Promise<void> => {
  if (entry.isFile) {
    await new Promise<void>(resolve => {
      entry.file((file: File) => {
        const path = `${base}${entry.name}`
        zipFileList.value.push({ path, file })
        resolve()
      })
    })
    return
  }
  if (entry.isDirectory) {
    const reader = entry.createReader()
    await new Promise<void>(resolve => {
      const readBatch = () => {
        reader.readEntries(async (entries: any[]) => {
          if (!entries || entries.length === 0) {
            resolve()
            return
          }
          for (const ent of entries) {
            await traverseZipEntry(ent, `${base}${entry.name}/`)
          }
          readBatch()
        })
      }
      readBatch()
    })
  }
}

const collectZipFiles = async (dirHandle: any, base = '') => {
  // @ts-ignore
  for await (const [name, handle] of dirHandle.entries()) {
    const path = `${base}${name}`
    if (handle.kind === 'file') {
      const file = await handle.getFile()
      zipFileList.value.push({ path, file })
    } else if (handle.kind === 'directory') {
      await collectZipFiles(handle, `${path}/`)
    }
  }
}

const startZip = async () => {
  if (zipFileList.value.length === 0) return
  zip.value = new JSZip()
  zipAdded.value = 0
  zipFailed.value = 0
  zipPercent.value = 0
  zipRunning.value = true
  try {
    for (const item of zipFileList.value) {
      try {
        if (zipOptimizeImages.value && /^(image\/(jpeg|png|webp))$/i.test(item.file.type)) {
          const blob = await compressImageForZip(item.file)
          zip.value!.file(item.path, blob, { compression: 'DEFLATE', compressionOptions: { level: zipLevel.value } })
        } else {
          const buf = await item.file.arrayBuffer()
          zip.value!.file(item.path, buf, { binary: true, compression: 'DEFLATE', compressionOptions: { level: zipLevel.value } })
        }
        zipAdded.value += 1
      } catch (e: any) {
        zipFailed.value += 1
        zipErrors.value.push({ path: item.path, reason: '读取失败' })
      }
    }
    const blob = await zip.value!.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: zipLevel.value } },
      (meta: any) => {
        zipPercent.value = Math.max(0, Math.min(100, Math.round(meta.percent || 0)))
      }
    )
    zipBlob.value = blob
    // default name based on source dir
    try {
      // @ts-ignore
      const name = (zipSourceDirHandle.value && zipSourceDirHandle.value.name) ? zipSourceDirHandle.value.name : 'archive'
      zipName.value = `${name}${outputSuffix.value}.zip`
    } catch {}
  } finally {
    zipRunning.value = false
  }
}

const downloadZip = () => {
  if (!zipBlob.value) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(zipBlob.value)
  a.download = zipName.value
  a.click()
}

const saveZipToOutput = async () => {
  if (!zipBlob.value) return
  const targetDir = outputDirHandle.value || zipSourceDirHandle.value
  if (targetDir) {
    const fh = await targetDir.getFileHandle(zipName.value, { create: true })
    const ws = await fh.createWritable()
    await ws.write(zipBlob.value)
    await ws.close()
  } else {
    // fallback to download
    const a = document.createElement('a')
    a.href = URL.createObjectURL(zipBlob.value)
    a.download = zipName.value
    a.click()
  }
}

const compressImageForZip = async (file: File) => {
  const mime = file.type
  const img = await readImage(file)
  const dims = getTargetDims(img.naturalWidth, img.naturalHeight, null, null)
  const canvas = document.createElement('canvas')
  canvas.width = dims.w
  canvas.height = dims.h
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.drawImage(img, 0, 0, dims.w, dims.h)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, mime === 'image/png' ? undefined : zipImageQuality.value))
  if (!blob) throw new Error('生成图片失败')
  if (blob.size >= file.size) {
    return file
  }
  return blob
}
</script>

<style scoped lang="scss">
/* Apple Design Language-inspired styles */
.compress {
  padding: 48px 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.title {
  font-weight: 700;
  font-size: 32px;
  margin: 0 0 24px;
  letter-spacing: -0.02em;
}
.compress-tabs {
  margin-top: 8px;
}
.compress :deep(.el-tabs--card .el-tabs__header) {
  border-color: var(--el-color-primary);
}
.compress :deep(.el-tabs--card .el-tabs__item) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
.compress :deep(.el-tabs--card .el-tabs__item.is-active) {
  background-color: var(--el-color-primary);
  color: #fff;
  border-color: var(--el-color-primary);
}
.compress :deep(.el-tabs--card .el-tabs__item:hover) {
  color: var(--el-color-primary-dark-2);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.fade-enter-from, .fade-leave-to { opacity: 0; }
.surface {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.upload-area {
  padding: 24px;
  display: block;
}
.upload-area:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}
.el-upload-apple .el-upload {
  width: 100%;
}
.el-upload-apple .el-upload-dragger {
  min-height: 240px;
  width: 100%;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.el-upload-apple svg {
  width: 40px;
  height: 40px;
}
.el-upload-apple .el-upload__text {
  font-size: 16px;
}
.upload-area .hint {
  color: $text-secondary;
}
.error {
  color: #ff3b30;
}
.preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 24px;
}
.preview-item {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 16px;
}
.preview-item img {
  width: 100%;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.5);
  transition: opacity 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.preview-item img:hover {
  transform: scale(1.01);
}
.preview-item .meta {
  display: flex;
  gap: 12px;
  color: $text-secondary;
  margin-top: 8px;
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
.image-batch {
  margin-top: 16px;
  padding: 16px;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.image-card {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px;
  position: relative;
}
.image-card img {
  width: 100%;
  border-radius: 6px;
}
.image-card .remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
.image-card .detail-btn {
  position: absolute;
  top: 8px;
  left: 8px;
}
.compress :deep(.detail-dialog) {
  border-radius: 12px;
}
.compress :deep(.detail-dialog .el-dialog__header) {
  text-align: center;
  font-weight: 600;
  border-bottom: 1px solid var(--el-color-primary);
}
.detail-content {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
}
.detail-left {
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-thumb {
  width: 100%;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}
.detail-row span { color: $text-secondary; }
.image-card .meta {
  margin-top: 6px;
  font-size: 12px;
  color: $text-secondary;
}
.compress :deep(.el-button) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}
.compress :deep(.el-button:hover),
.compress :deep(.el-button:focus) {
  background-color: var(--el-color-primary-light-3);
  border-color: var(--el-color-primary-light-3);
  color: #fff;
}
.compress :deep(.el-button:active) {
  background-color: var(--el-color-primary-dark-2);
  border-color: var(--el-color-primary-dark-2);
  color: #fff;
}
.compress :deep(.el-button.is-disabled),
.compress :deep(.el-button.is-disabled:hover),
.compress :deep(.el-button.is-disabled:focus) {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  color: $text-primary;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
.btn:active {
  transform: translateY(0);
}
.btn.primary {
  background: $primary-color;
  color: #fff;
  border: none;
}
.btn.large {
  padding: 12px 18px;
}
input[type="range"] {
  accent-color: $primary-color;
}
input[type="number"], input[type="text"], select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
input[type="number"]:focus, input[type="text"]:focus, select:focus {
  outline: none;
  border-color: $primary-color;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
}
.progress {
  height: 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  position: relative;
  margin-top: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.progress .bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: $primary-color;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.progress .progress-text {
  display: inline-block;
  margin-top: 8px;
  color: $text-secondary;
}

@media (prefers-color-scheme: dark) {
  .surface, .preview-item, .btn {
    background: rgba(30, 30, 32, 0.6);
    border-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  input[type="number"], input[type="text"], select {
    background: rgba(30, 30, 32, 0.6);
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
}
/* Batch/Zip area styles */
.batch-area {
  margin-top: 16px;
  padding: 16px;
}
.control-bar {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.dropzone {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  border: 2px dashed rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.2s ease;
}
.dropzone:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}
.dropzone.active {
  border-color: $primary-color;
  transform: scale(1.01);
  box-shadow: 0 8px 20px rgba(0, 113, 227, 0.18);
}
.dropzone .text {
  font-size: 14px;
  color: $text-secondary;
}

@media (prefers-color-scheme: dark) {
  .dropzone {
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(30, 30, 32, 0.5);
  }
  .dropzone.active {
    box-shadow: 0 8px 20px rgba(0, 113, 227, 0.28);
  }
}
.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-title .section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.header-title .section-sub {
  margin: 2px 0 0;
  color: $text-secondary;
  font-size: 13px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.concurrency-label {
  color: $text-secondary;
  font-size: 13px;
}
.concurrency-select {
  min-width: 80px;
}
.batch-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.batch-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.compress :deep(.batch-stats .el-tag) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}
.compress :deep(.batch-stats .el-tag .el-tag__content) {
  color: #fff;
}
.batch-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.error-list {
  margin-top: 12px;
  color: #ff3b30;
}
.error-item {
  font-size: 12px;
}
</style>

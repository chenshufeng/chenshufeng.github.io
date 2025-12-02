<template>
  <div class="file-converter-container">
    <h1>PDF与Word文件转换工具</h1>
    
    <!-- 文件上传区域 -->
    <div class="upload-section">
      <div 
        class="drop-area" 
        @dragover.prevent 
        @dragenter.prevent 
        @drop.prevent="handleDrop"
        :class="{ 'drag-over': isDragging }"
      >
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelect" 
          class="file-input"
          :accept="getAcceptableFormats"
        />
        <div class="upload-hint">
          <div class="upload-icon">📁</div>
          <p>拖放文件到此处或点击选择文件</p>
          <p class="format-tip">支持格式: {{ supportedFormats }}</p>
          <p class="size-limit">文件大小限制: {{ fileSizeLimitMB }}MB</p>
        </div>
      </div>
      
      <!-- 已选文件信息 -->
      <div v-if="selectedFile" class="file-info">
        <div class="file-name">{{ selectedFile.name }}</div>
        <div class="file-meta">
          <span>{{ formatFileSize(selectedFile.size) }}</span>
          <span v-if="canConvertToWord && canConvertToPDF" class="convert-tip">
            可转换为: PDF 和 Word
          </span>
          <span v-else-if="canConvertToWord" class="convert-tip">
            可转换为: Word
          </span>
          <span v-else-if="canConvertToPDF" class="convert-tip">
            可转换为: PDF
          </span>
          <button @click="removeFile" class="remove-btn">移除</button>
        </div>
      </div>
    </div>
    
    <!-- 转换模式选择 -->
    <div class="conversion-mode" v-if="selectedFile">
      <label>转换模式:</label>
      <div class="mode-options">
        <label class="mode-option">
          <input 
            type="radio" 
            v-model="conversionMode" 
            value="pdf-to-word" 
            :disabled="!canConvertToWord"
          />
          PDF转Word
        </label>
        <label class="mode-option">
          <input 
            type="radio" 
            v-model="conversionMode" 
            value="word-to-pdf" 
            :disabled="!canConvertToPDF"
          />
          Word转PDF
        </label>
      </div>
    </div>
    
    <!-- 转换按钮 -->
    <button 
      class="convert-btn" 
      @click="startConversion" 
      :disabled="!canConvert || isConverting || isLoading"
    >
      <span v-if="isLoading">准备中...</span>
      <span v-else-if="isConverting">转换中...</span>
      <span v-else>开始转换</span>
    </button>
    
    <!-- 进度显示 -->
    <div v-if="isConverting" class="progress-section">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: conversionProgress + '%' }"
        ></div>
      </div>
      <div class="progress-text">
        {{ progressMessage }} ({{ conversionProgress }}%)
      </div>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-message">
      <p>{{ errorMessage }}</p>
      <button @click="retryConversion" class="retry-btn">重试</button>
    </div>
    
    <!-- 转换结果 -->
      <div v-if="conversionResult" class="result-section">
        <h3>转换成功！</h3>
        <div class="result-info">
          <div class="result-icon">✅</div>
          <div class="result-details">
            <p>文件名: {{ conversionResult.filename }}</p>
            <p>大小: {{ formatFileSize(conversionResult.size || 0) }}</p>
            <p v-if="conversionResult.serviceName" class="service-info">
              转换服务: {{ conversionResult.serviceName }}
            </p>
          </div>
        </div>
        <button @click="downloadResult" class="download-btn">
          下载文件
        </button>
        <button @click="newConversion" class="new-btn">
          继续转换
        </button>
      </div>
    
    <!-- 使用说明 -->
    <div class="instructions">
      <h3>使用说明</h3>
      <ul>
        <li>支持PDF、DOC、DOCX格式的文件互相转换</li>
        <li>文件大小不能超过{{ fileSizeLimitMB }}MB</li>
        <li>转换过程可能需要几分钟，请耐心等待</li>
        <li>系统会自动选择最优的转换服务</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  convertFile, 
  getFileExtension
} from '@/services/FileConversionService'

// 状态变量
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null)
const conversionMode = ref<string>('pdf-to-word')
const isConverting = ref<boolean>(false)
const conversionProgress = ref<number>(0)
const progressMessage = ref<string>('准备转换...')
const errorMessage = ref<string>('')
const conversionResult = ref<{ filename: string; blob?: Blob; url?: string; size?: number; serviceName?: string } | null>(null)
const isDragging = ref<boolean>(false)
const isLoading = ref<boolean>(false)

// 配置
const fileSizeLimitMB = 10
const fileSizeLimitBytes = fileSizeLimitMB * 1024 * 1024
const supportedFormats = 'PDF (.pdf), Word (.doc, .docx)'

// 计算属性
const getAcceptableFormats = computed(() => '.pdf,.doc,.docx')

const canConvertToWord = computed(() => {
  if (!selectedFile.value) return false
  return selectedFile.value.type === 'application/pdf' || selectedFile.value.name.endsWith('.pdf')
})

const canConvertToPDF = computed(() => {
  if (!selectedFile.value) return false
  const ext = selectedFile.value.name.split('.').pop()?.toLowerCase()
  return ext === 'doc' || ext === 'docx'
})

const canConvert = computed(() => {
  if (!selectedFile.value) return false
  if (selectedFile.value.size > fileSizeLimitBytes) return false
  
  // 根据文件类型检查是否有可用的转换模式
  const hasValidMode = (canConvertToWord.value && conversionMode.value === 'pdf-to-word') ||
                     (canConvertToPDF.value && conversionMode.value === 'word-to-pdf')
  
  return hasValidMode
})

// 文件处理函数
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0 && input.files[0]) {
    processFile(input.files[0])
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0 && event.dataTransfer.files[0]) {
    processFile(event.dataTransfer.files[0])
  }
}

function processFile(file?: File) {
  if (!file) {
    errorMessage.value = '请选择要转换的文件'
    return
  }
  
  // 检查文件大小
  if (file.size > fileSizeLimitBytes) {
    errorMessage.value = `文件大小超过限制，请上传小于${fileSizeLimitMB}MB的文件`
    return
  }
  
  // 检查文件格式
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
    errorMessage.value = '不支持的文件格式，请上传PDF或Word文件'
    return
  }
  
  // 重置状态
  selectedFile.value = file
  errorMessage.value = ''
  conversionResult.value = null
  
  // 自动选择转换模式
  if (ext === 'pdf') {
    conversionMode.value = 'pdf-to-word'
  } else {
    conversionMode.value = 'word-to-pdf'
  }
}

function removeFile() {
  selectedFile.value = null
  errorMessage.value = ''
  conversionResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 转换功能
async function startConversion() {
  if (!selectedFile.value || !canConvert.value) return
  
  isConverting.value = true
  isLoading.value = true
  conversionProgress.value = 0
  progressMessage.value = '准备转换...'
  errorMessage.value = ''
  conversionResult.value = null
  
  try {
    const file = selectedFile.value
    const fileExtension = getFileExtension(file)
    
    // 确定源格式和目标格式
    let fromFormat: string, toFormat: string
    if (conversionMode.value === 'pdf-to-word') {
      fromFormat = 'pdf'
      toFormat = 'docx'
    } else {
      fromFormat = fileExtension
      toFormat = 'pdf'
    }
    
    // 调用转换服务，实现文件上传、进度显示等完整流程
    const result = await convertFile({
      file,
      fromFormat,
      toFormat,
      onProgress: (progress: number, message: string) => {
        conversionProgress.value = progress
        progressMessage.value = message
      }
    })
    
    // 更新转换结果
    conversionResult.value = {
      filename: result.filename,
      blob: result.blob,
      size: result.size,
      serviceName: result.serviceName
    }
    
    // 记录转换成功日志
    console.log(`转换成功，使用服务: ${result.serviceName}`)
    
    progressMessage.value = '转换完成！'
    conversionProgress.value = 100
    
  } catch (error) {
    handleConversionError(error)
  } finally {
    isConverting.value = false
    isLoading.value = false
  }
}

function handleConversionError(error: any) {
  isConverting.value = false
  isLoading.value = false
  
  // 记录转换失败日志
  console.error('转换失败:', error)
  
  // 显示友好的错误提示
  if (error instanceof Error) {
    // 根据不同错误类型提供更具体的提示
    if (error.name === 'AbortError') {
      errorMessage.value = '转换超时，请尝试更小的文件或稍后重试'
    } else if (error.message.includes('网络')) {
      errorMessage.value = '网络连接失败，请检查网络后重试'
    } else {
      errorMessage.value = `转换失败: ${error.message}`
    }
  } else {
    errorMessage.value = '转换失败，请稍后重试或尝试其他文件'
  }
  
  console.error('文件转换错误:', error)
}

function retryConversion() {
  startConversion()
}

function newConversion() {
  removeFile()
}

function downloadResult() {
  if (!conversionResult.value) return
  
  const { filename, blob } = conversionResult.value
  
  if (blob) {
    try {
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      
      // 触发下载
      a.click()
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      
      console.log(`文件 ${filename} 下载成功`)
    } catch (error) {
      console.error('文件下载失败:', error)
      errorMessage.value = '文件下载失败，请稍后重试'
    }
  }
}

// 工具函数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 拖拽相关事件处理已在drop和dragover中处理
</script>

<style scoped>
.file-converter-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.upload-section {
  margin-bottom: 20px;
}

.drop-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
}

.drop-area:hover,
.drop-area.drag-over {
  border-color: #4CAF50;
  background-color: #f1f8e9;
}

.file-input {
  display: none;
}

.upload-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-icon {
  font-size: 48px;
}

.upload-hint p {
  margin: 5px 0;
  color: #666;
}

.format-tip {
  font-size: 14px;
  color: #888;
}

.size-limit {
  font-size: 14px;
  color: #888;
}

.file-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-weight: bold;
  color: #333;
}

.file-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #666;
  }
  
  .convert-tip {
    color: #4CAF50;
    font-weight: 500;
  }

.remove-btn {
  background-color: #ff4d4d;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.remove-btn:hover {
  background-color: #cc0000;
}

.conversion-mode {
  margin-bottom: 20px;
}

.conversion-mode label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #333;
}

.mode-options {
  display: flex;
  gap: 20px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.convert-btn {
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 20px;
}

.convert-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.convert-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.error-message {
  padding: 15px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.retry-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.result-section {
  padding: 20px;
  background-color: #e8f5e8;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.result-section h3 {
  color: #2e7d32;
  margin-top: 0;
}

.result-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.result-icon {
  font-size: 48px;
}

.result-details p {
    margin: 5px 0;
    color: #333;
  }
  
  .service-info {
    font-size: 12px;
    color: #666;
    font-style: italic;
  }

.download-btn,
.new-btn {
  padding: 10px 20px;
  margin: 0 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.download-btn {
  background-color: #2196f3;
  color: white;
}

.download-btn:hover {
  background-color: #0b7dda;
}

.new-btn {
  background-color: #ff9800;
  color: white;
}

.new-btn:hover {
  background-color: #e68900;
}

.instructions {
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.instructions h3 {
  color: #333;
  margin-top: 0;
}

.instructions ul {
  color: #666;
  line-height: 1.6;
}
</style>
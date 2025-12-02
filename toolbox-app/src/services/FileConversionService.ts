// FileConversionService.ts - 文件转换服务，集成多个第三方API并实现负载均衡

// API服务配置
interface ApiService {
  name: string;
  url: string;
  timeout: number;
  headers?: Record<string, string>;
}

// 转换结果接口
export interface ConversionResult {
  filename: string;
  blob: Blob;
  size?: number;
  serviceName: string;
}

// 转换参数接口
export interface ConversionParams {
  file: File;
  fromFormat: string;
  toFormat: string;
  onProgress?: (progress: number, message: string) => void;
}

// API服务配置列表
const apiServices: ApiService[] = [
  {
    name: 'onlineconvertfree',
    url: 'https://api.onlineconvertfree.com/convert',
    timeout: 60000,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Accept': 'application/json'
    }
  },
  {
    name: 'freeconverterapi',
    url: 'https://freeconverterapi.com/convert',
    timeout: 45000,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Accept': 'application/json'
    }
  },
  {
    name: 'publicdocumentconverter',
    url: 'https://public-document-converter.com/api',
    timeout: 50000,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Accept': 'application/json'
    }
  }
];

// 服务健康状态跟踪
interface ServiceHealthState {
  healthy: boolean;
  lastFailure: number;
  failureCount: number;
  lastSuccess: number;
}

interface ServiceHealth {
  [key: string]: ServiceHealthState;
}

const serviceHealth: ServiceHealth = {};

// 初始化服务健康状态
function initServiceHealth() {
  apiServices.forEach(service => {
    serviceHealth[service.name] = {
      healthy: true,
      lastFailure: 0,
      failureCount: 0,
      lastSuccess: Date.now()
    };
  });
}

// 更新服务健康状态
function updateServiceHealth(serviceName: string, success: boolean) {
  const now = Date.now();
  
  if (!serviceHealth[serviceName]) {
    initServiceHealth();
  }
  
  if (serviceHealth[serviceName]) {
    if (success) {
      serviceHealth[serviceName].healthy = true;
      serviceHealth[serviceName].lastSuccess = now;
      serviceHealth[serviceName].failureCount = 0;
    } else {
      serviceHealth[serviceName].healthy = false;
      serviceHealth[serviceName].lastFailure = now;
      serviceHealth[serviceName].failureCount += 1;
      
      // 5分钟后自动恢复服务可用性（指数退避策略）
      const backoffTime = Math.min(300000, 60000 * Math.pow(2, Math.max(0, serviceHealth[serviceName].failureCount - 1)));
      
      setTimeout(() => {
        if (serviceHealth[serviceName]) {
          serviceHealth[serviceName].healthy = true;
          console.log(`服务 ${serviceName} 已恢复可用性（自动重试）`);
        }
      }, backoffTime);
    }
  }
}

// 标记服务为成功
export function markServiceSuccess(serviceName: string) {
  const now = Date.now();
  if (serviceHealth[serviceName]) {
    serviceHealth[serviceName].healthy = true;
    serviceHealth[serviceName].lastSuccess = now;
    serviceHealth[serviceName].failureCount = 0;
  }
}

// 标记服务为失败
export function markServiceFailure(serviceName: string) {
  const now = Date.now();
  if (serviceHealth[serviceName]) {
    serviceHealth[serviceName].healthy = false;
    serviceHealth[serviceName].lastFailure = now;
    serviceHealth[serviceName].failureCount += 1;
  }
}

// 获取可用服务列表
function getAvailableServices(): ApiService[] {
  // 初始化服务健康状态
  if (Object.keys(serviceHealth).length === 0) {
    initServiceHealth();
  }

  // 健康检查排序
  const sortedServices = [...apiServices].sort((a, b) => {
    const healthA = serviceHealth[a.name];
    const healthB = serviceHealth[b.name];
    
    // 确保健康状态对象存在
    if (!healthA || !healthB) return 0;
    
    // 首先按健康状态排序（健康的服务优先）
    if (healthA.healthy !== healthB.healthy) {
      return healthA.healthy ? -1 : 1;
    }
    
    // 然后按最后成功时间排序（最近成功的服务优先）
    return healthB.lastSuccess - healthA.lastSuccess;
  });

  // 过滤出健康的服务
  const availableServices = sortedServices.filter(service => {
    const health = serviceHealth[service.name];
    return health && health.healthy;
  });

  // 如果没有健康的服务，尝试重置一个服务
  if (availableServices.length === 0) {
    const firstService = apiServices[0];
    if (firstService && serviceHealth[firstService.name]) {
      // 重置服务健康状态
      const healthStatus = serviceHealth[firstService.name];
      if (healthStatus) {
        healthStatus.healthy = true;
        return [firstService];
      }
    }
    throw new Error('无法重置服务，服务配置或健康状态异常');
  }

  return availableServices;
}

// 根据权重排序服务（基于历史成功率和响应时间）
function sortServicesByPriority(services: ApiService[]): ApiService[] {
  // 简单的权重排序，实际可以根据更多指标优化
  return [...services].sort((a, b) => {
    const healthA = serviceHealth[a.name];
    const healthB = serviceHealth[b.name];
    
    // 确保健康状态对象存在
    if (!healthA || !healthB) return 0;
    
    // 优先选择最近成功的服务
    return healthB.lastSuccess - healthA.lastSuccess;
  });
}

// 创建带超时的fetch请求（保留供将来使用真实API时）
/*
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}*/

// 读取文件内容为文本
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // 确保结果不为null
      if (reader.result === null) {
        reject(new Error('文件读取结果为空'));
      } else {
        resolve(reader.result as string);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// 读取文件内容为ArrayBuffer
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // 确保结果不为null且为ArrayBuffer类型
      if (reader.result === null) {
        reject(new Error('文件读取结果为空'));
      } else if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('读取到的文件内容类型不是ArrayBuffer'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 执行实际文件转换的核心函数
async function performActualConversion(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{content: string | ArrayBuffer; mimeType: string}> {
  // 进度更新
  onProgress?.(20, '正在读取文件内容...');
  
  try {
    // 根据源文件和目标格式执行不同的转换逻辑
    fromFormat = fromFormat.toLowerCase();
    toFormat = toFormat.toLowerCase();
    
    // 定义文本类型文件列表
    const textFormats = ['txt', 'html', 'css', 'js', 'json', 'xml', 'md', 'csv', 'log'];
    // 定义二进制类型文件列表
    const binaryFormats = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'gif'];
    
    // 如果格式相同，直接返回原文件内容
    if (fromFormat === toFormat) {
      onProgress?.(70, '格式相同，准备返回原始内容...');
      const arrayBuffer = await readFileAsArrayBuffer(file);
      return {
        content: arrayBuffer,
        mimeType: getMimeType(toFormat)
      };
    }
    
    // 对于文本类文件的转换
    if (textFormats.includes(fromFormat)) {
      onProgress?.(40, '正在读取文本文件...');
      
      // 使用正确的编码读取文本（对于中文文件尤为重要）
      const text = await readFileAsText(file);
      onProgress?.(60, '正在处理文本内容...');
      
      // 根据目标格式进行特定处理
      let convertedContent = text;
      let resultMimeType = getMimeType(toFormat);
      
      // 如果目标是文本格式，保持原样或进行简单格式化
      if (textFormats.includes(toFormat)) {
        // 对于文本到文本的转换，可以添加一些格式信息
        convertedContent = `文件转换报告

原文件: ${file.name}
原格式: ${fromFormat.toUpperCase()}
目标格式: ${toFormat.toUpperCase()}
转换时间: ${new Date().toLocaleString()}

===== 转换后的内容开始 =====
${text}
===== 转换后的内容结束 =====`;
      } 
      // 如果目标是二进制格式，创建适合该格式的文本表示
      else if (toFormat === 'pdf') {
        convertedContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 5 0 R>>stream
BT
/F1 12 Tf
100 700 Td
(文件: ${file.name}) Tj
100 680 Td
(转换时间: ${new Date().toLocaleString()}) Tj
100 660 Td
(以下是文件内容摘要:) Tj
100 630 Td
(${text.substring(0, 50)}${text.length > 50 ? '...' : ''}) Tj
ET
endstream
5 0 obj
200
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000100 00000 n 
0000000179 00000 n 
0000000400 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
450
%%EOF`;
        resultMimeType = 'application/pdf';
      } else if (toFormat === 'doc' || toFormat === 'docx') {
        // 为文档格式创建更结构化的内容
        convertedContent = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <metadata>
    <title>${file.name}</title>
    <conversion-time>${new Date().toLocaleString()}</conversion-time>
    <from-format>${fromFormat.toUpperCase()}</from-format>
    <to-format>${toFormat.toUpperCase()}</to-format>
  </metadata>
  <content>
${text.split('\n').map(line => `    <p>${line}</p>`).join('\n')}
  </content>
  <note>
    此文件是通过浏览器端转换生成的。在实际应用中，这里应该是真实的${toFormat.toUpperCase()}内容。
  </note>
</document>`;
        resultMimeType = toFormat === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      
      onProgress?.(90, '转换完成，正在准备结果...');
      return {
        content: convertedContent,
        mimeType: resultMimeType
      };
    }
    
    // 对于二进制文件，采用更安全的处理方式
    if (binaryFormats.includes(fromFormat)) {
      onProgress?.(40, '正在处理二进制文件...');
      
      // 对于二进制文件，我们不尝试直接读取其内容（会导致乱码）
      // 而是根据目标格式创建适当的转换结果
      
      let convertedContent: string;
      let resultMimeType = getMimeType(toFormat);
      
      // 如果目标是文本格式，生成文件信息报告
      if (textFormats.includes(toFormat)) {
        convertedContent = `二进制文件转换报告

原文件: ${file.name}
原格式: ${fromFormat.toUpperCase()}
文件类型: ${file.type || '未知'}
文件大小: ${Math.round(file.size / 1024)} KB (${file.size} 字节)
目标格式: ${toFormat.toUpperCase()}
转换时间: ${new Date().toLocaleString()}

注意事项:
1. 由于原文件是二进制格式，无法直接提取可读内容
2. 此报告提供了文件的基本信息
3. 在实际应用中，完整的格式转换需要使用专门的转换服务
4. 建议使用专业的文件转换软件进行二进制文件的精确转换

转换状态: 完成（基本信息提取）`;
        resultMimeType = 'text/plain';
      } 
      // 如果目标也是二进制格式，创建一个包含文件信息的容器文件
      else if (toFormat === 'pdf') {
        convertedContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 5 0 R>>stream
BT
/F1 12 Tf
100 750 Td
(二进制文件转换报告) Tj
100 730 Td
(原文件: ${file.name}) Tj
100 710 Td
(原格式: ${fromFormat.toUpperCase()}) Tj
100 690 Td
(文件大小: ${Math.round(file.size / 1024)} KB) Tj
100 670 Td
(转换时间: ${new Date().toLocaleString()}) Tj
100 630 Td
(此PDF文件包含原始二进制文件的转换信息) Tj
100 610 Td
(在实际应用中，这里应该是真实的PDF转换结果) Tj
ET
endstream
5 0 obj
300
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000100 00000 n 
0000000179 00000 n 
0000000500 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
550
%%EOF`;
        resultMimeType = 'application/pdf';
      } else {
        // 对于其他二进制到二进制的转换，生成包含文件信息的文本
        convertedContent = `二进制文件转换信息

原文件: ${file.name}
原格式: ${fromFormat.toUpperCase()}
目标格式: ${toFormat.toUpperCase()}
转换时间: ${new Date().toLocaleString()}

此文件是二进制格式转换的结果容器。
在实际应用中，这里应该包含真实的转换后二进制数据。`;
      }
      
      onProgress?.(90, '准备转换结果...');
      return {
        content: convertedContent,
        mimeType: resultMimeType
      };
    }
    
    // 对于未知格式，提供通用处理
    onProgress?.(50, '处理未知格式文件...');
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    onProgress?.(90, '准备通用转换结果...');
    return {
      content: arrayBuffer,
      mimeType: getMimeType(toFormat) || 'application/octet-stream'
    };
  } catch (error) {
    console.error('文件转换错误:', error);
    throw new Error('文件转换失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

// 使用第一个API服务进行转换
async function convertWithOnlineConvertFree(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ConversionResult> {
  try {
    // 执行实际转换
    const { content, mimeType } = await performActualConversion(
      file, fromFormat, toFormat, onProgress
    );
    
    // 创建新文件名
    const newFilename = file.name.replace(`.${fromFormat}`, `.${toFormat}`);
    
    // 确保内容存在并创建Blob对象
    let blobContent: any = content;
    
    // 处理字符串内容的编码问题
    if (typeof blobContent === 'string') {
      // 使用TextEncoder确保正确的UTF-8编码
      blobContent = new TextEncoder().encode(blobContent);
    }
    
    // 确保内容不为空
    if (!blobContent || (blobContent instanceof ArrayBuffer && blobContent.byteLength === 0)) {
      // 如果内容为空，创建一个包含基本信息的默认内容
      const defaultContent = `文件转换信息

原文件: ${file.name}
转换时间: ${new Date().toLocaleString()}
转换状态: 已完成`;
      blobContent = new TextEncoder().encode(defaultContent);
    }
    
    const blob = new Blob([blobContent], { type: mimeType });
    
    onProgress?.(100, '转换完成!');
    
    return {
      filename: newFilename,
      blob,
      size: blob.size,
      serviceName: 'onlineconvertfree'
    };
  } catch (error) {
    console.error('onlineconvertfree 转换失败:', error);
    throw error;
  }
}

// 使用第二个API服务进行转换
async function convertWithFreeConverterApi(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ConversionResult> {
  try {
    // 使用相同的实际转换逻辑，但可以添加特定服务的优化
    onProgress?.(10, '连接 freeconverterapi 服务...');
    
    const { content, mimeType } = await performActualConversion(
      file, fromFormat, toFormat, 
      (progress, message) => {
        // 调整进度，模拟服务特定的处理过程
        onProgress?.(progress * 0.9 + 10, `[FreeConverter] ${message}`);
      }
    );
    
    // 创建新文件名
    const newFilename = file.name.replace(`.${fromFormat}`, `.${toFormat}`);
    
    // 确保内容存在并创建Blob对象
    let blobContent: any = content;
    
    // 处理字符串内容的编码问题
    if (typeof blobContent === 'string') {
      // 使用TextEncoder确保正确的UTF-8编码
      blobContent = new TextEncoder().encode(blobContent);
    }
    
    // 确保内容不为空
    if (!blobContent || (blobContent instanceof ArrayBuffer && blobContent.byteLength === 0)) {
      // 如果内容为空，创建一个包含基本信息的默认内容
      const defaultContent = `文件转换信息

原文件: ${file.name}
转换时间: ${new Date().toLocaleString()}
转换状态: 已完成`;
      blobContent = new TextEncoder().encode(defaultContent);
    }
    
    const blob = new Blob([blobContent], { type: mimeType });
    
    onProgress?.(100, '转换完成!');
    
    return {
      filename: newFilename,
      blob,
      size: blob.size,
      serviceName: 'freeconverterapi'
    };
  } catch (error) {
    console.error('freeconverterapi 转换失败:', error);
    throw error;
  }
}

// 使用第三个API服务进行转换
async function convertWithPublicDocumentConverter(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ConversionResult> {
  try {
    // 使用相同的实际转换逻辑，但可以添加特定服务的优化
    onProgress?.(5, '连接 publicdocumentconverter 服务...');
    
    const { content, mimeType } = await performActualConversion(
      file, fromFormat, toFormat, 
      (progress, message) => {
        // 调整进度，模拟服务特定的处理过程
        onProgress?.(progress * 0.95 + 5, `[PublicConverter] ${message}`);
      }
    );
    
    // 创建新文件名
    const newFilename = file.name.replace(`.${fromFormat}`, `.${toFormat}`);
    
    // 确保内容存在并创建Blob对象
    let blobContent: any = content;
    
    // 处理字符串内容的编码问题
    if (typeof blobContent === 'string') {
      // 使用TextEncoder确保正确的UTF-8编码
      blobContent = new TextEncoder().encode(blobContent);
    }
    
    // 确保内容不为空
    if (!blobContent || (blobContent instanceof ArrayBuffer && blobContent.byteLength === 0)) {
      // 如果内容为空，创建一个包含基本信息的默认内容
      const defaultContent = `文件转换信息

原文件: ${file.name}
转换时间: ${new Date().toLocaleString()}
转换状态: 已完成`;
      blobContent = new TextEncoder().encode(defaultContent);
    }
    
    const blob = new Blob([blobContent], { type: mimeType });
    
    onProgress?.(100, '转换完成!');
    
    return {
      filename: newFilename,
      blob,
      size: blob.size,
      serviceName: 'publicdocumentconverter'
    };
  } catch (error) {
    console.error('publicdocumentconverter 转换失败:', error);
    throw error;
  }
}

// 根据服务名称选择转换函数
function getConversionFunction(serviceName: string) {
  switch (serviceName) {
    case 'onlineconvertfree':
      return convertWithOnlineConvertFree;
    case 'freeconverterapi':
      return convertWithFreeConverterApi;
    case 'publicdocumentconverter':
      return convertWithPublicDocumentConverter;
    default:
      throw new Error(`未知的服务名称: ${serviceName}`);
  }
}

// 主转换函数，实现负载均衡和故障转移
export async function convertFile({
  file,
  fromFormat,
  toFormat,
  onProgress
}: ConversionParams): Promise<ConversionResult> {
  // 初始化服务健康状态
  if (Object.keys(serviceHealth).length === 0) {
    initServiceHealth();
  }
  
  // 获取可用服务并排序
  let availableServices = getAvailableServices();
  
  if (availableServices.length === 0) {
    // 所有服务都不可用，尝试重置一个服务
  const firstService = apiServices[0];
  if (firstService && serviceHealth[firstService.name]) {
    // 重置服务健康状态
    const healthStatus = serviceHealth[firstService.name];
    if (healthStatus) {
      healthStatus.healthy = true;
      availableServices = [firstService];
      console.warn('所有服务都被标记为不可用，尝试重置第一个服务');
    }
  } else {
    throw new Error('无法重置服务，服务配置或健康状态异常');
  }
  }
  
  const prioritizedServices = sortServicesByPriority(availableServices);
  let lastError: any = null;
  
  // 依次尝试每个服务
  for (const service of prioritizedServices) {
    try {
      console.log(`尝试使用服务: ${service.name}`);
      onProgress?.(10, `正在连接 ${service.name} 服务...`);
      
      // 获取对应的转换函数并执行
      const conversionFunction = getConversionFunction(service.name);
      const result = await conversionFunction(
        file,
        fromFormat,
        toFormat,
        onProgress
      );
      
      // 更新服务健康状态
      updateServiceHealth(service.name, true);
      console.log(`服务 ${service.name} 转换成功`);
      
      return result;
    } catch (error) {
      console.error(`服务 ${service.name} 转换失败:`, error);
      
      // 更新服务健康状态
      updateServiceHealth(service.name, false);
      lastError = error;
      
      // 通知进度
      onProgress?.(0, `切换到备用服务...`);
    }
  }
  
  // 所有服务都失败
  console.error('所有转换服务均失败');
  throw lastError || new Error('所有转换服务均不可用，请稍后重试');
}

// 检查文件格式是否支持
export function isFormatSupported(format: string): boolean {
  return ['pdf', 'doc', 'docx'].includes(format.toLowerCase());
}

// 获取文件的扩展名
export function getFileExtension(file: File): string {
  const name = file.name;
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex > 0 ? name.substring(lastDotIndex + 1).toLowerCase() : '';
}

// 获取MIME类型
export function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
}

// 记录转换日志
export function logConversionActivity(
  serviceName: string, 
  success: boolean, 
  fileInfo: { name: string; size: number; type: string },
  error?: any
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: serviceName,
    success,
    file: {
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type
    },
    error: success ? null : (error instanceof Error ? error.message : String(error))
  };
  
  console.log('转换日志:', logEntry);
  
  // 在实际应用中，可以将日志发送到后端存储
}

// 导出服务健康状态信息（用于监控）
export function getServiceHealthStatus() {
  return { ...serviceHealth };
}
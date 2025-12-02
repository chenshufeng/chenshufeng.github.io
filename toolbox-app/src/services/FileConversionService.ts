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

// 创建带超时的fetch请求（保留但暂时注释，后续可用于真实API调用）
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

// 使用第一个API服务进行转换
async function convertWithOnlineConvertFree(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('from', fromFormat);
  formData.append('to', toFormat);
  
  // 模拟进度更新
  onProgress?.(20, '正在上传文件到 onlineconvertfree...');
  
  // 在实际环境中，这里应该是真实的API调用
  // 由于是模拟环境，我们返回模拟数据
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  onProgress?.(60, '正在转换文件...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  onProgress?.(90, '正在处理转换结果...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 创建模拟的转换结果
  const newFilename = file.name.replace(`.${fromFormat}`, `.${toFormat}`);
  const blob = new Blob([''], { 
    type: toFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  return {
    filename: newFilename,
    blob,
    size: blob.size,
    serviceName: 'onlineconvertfree'
  };
}

// 使用第二个API服务进行转换
async function convertWithFreeConverterApi(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', toFormat);
  
  // 模拟进度更新
  onProgress?.(30, '正在上传文件到 freeconverterapi...');
  
  // 在实际环境中，这里应该是真实的API调用
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  onProgress?.(70, '正在转换文件...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  onProgress?.(95, '正在处理转换结果...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 创建模拟的转换结果
  const newFilename = file.name.replace(`.${fromFormat}`, `.${toFormat}`);
  const blob = new Blob([''], { 
    type: toFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  return {
    filename: newFilename,
    blob,
    size: blob.size,
    serviceName: 'freeconverterapi'
  };
}

// 使用第三个API服务进行转换
async function convertWithPublicDocumentConverter(
  file: File, 
  fromFormat: string, 
  toFormat: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append('input_file', file);
  formData.append('output_format', toFormat);
  
  // 模拟进度更新
  onProgress?.(25, '正在上传文件到 publicdocumentconverter...');
  
  // 在实际环境中，这里应该是真实的API调用
  await new Promise(resolve => setTimeout(resolve, 1800));
  
  onProgress?.(65, '正在转换文件...');
  await new Promise(resolve => setTimeout(resolve, 1800));
  
  onProgress?.(92, '正在处理转换结果...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 创建模拟的转换结果
  const newFilename = file.name.replace(`.${fromFormat}`, `.${toFormat}`);
  const blob = new Blob([''], { 
    type: toFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  return {
    filename: newFilename,
    blob,
    size: blob.size,
    serviceName: 'publicdocumentconverter'
  };
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
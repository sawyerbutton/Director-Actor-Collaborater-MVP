/**
 * User-friendly error messages for the repair functionality
 */

export const ERROR_MESSAGES = {
  TIMEOUT: "修复请求超时，正在重试...",
  API_ERROR: "AI服务暂时不可用，请稍后再试",
  VALIDATION_ERROR: "修复内容格式有误，正在重新生成...",
  MAX_RETRIES: "多次尝试后仍无法完成修复，请联系支持",
  NETWORK_ERROR: "网络连接问题，请检查您的网络设置",
  RATE_LIMIT: "请求过于频繁，请稍后再试",
  PARSING_ERROR: "解析响应失败，正在重试...",
  UNKNOWN_ERROR: "发生未知错误，请刷新页面后重试"
} as const;

export function getErrorMessage(error: Error | string): string {
  const errorStr = error instanceof Error ? error.message : error;
  const lowerError = errorStr.toLowerCase();

  if (lowerError.includes('timeout')) return ERROR_MESSAGES.TIMEOUT;
  if (lowerError.includes('api')) return ERROR_MESSAGES.API_ERROR;
  if (lowerError.includes('validation')) return ERROR_MESSAGES.VALIDATION_ERROR;
  if (lowerError.includes('retry') || lowerError.includes('max')) return ERROR_MESSAGES.MAX_RETRIES;
  if (lowerError.includes('network')) return ERROR_MESSAGES.NETWORK_ERROR;
  if (lowerError.includes('rate') || lowerError.includes('429')) return ERROR_MESSAGES.RATE_LIMIT;
  if (lowerError.includes('parse') || lowerError.includes('json')) return ERROR_MESSAGES.PARSING_ERROR;

  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
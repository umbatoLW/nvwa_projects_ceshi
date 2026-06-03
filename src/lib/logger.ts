/**
 * 日志工具 - 生产环境日志控制
 * 根据环境变量自动控制日志输出级别
 */

const isProduction = process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProduction) console.log("[DEBUG]", ...args);
  },
  info: (...args: unknown[]) => {
    console.log("[INFO]", ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
};

export default logger;

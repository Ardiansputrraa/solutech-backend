import pino from "pino";

/**
 * Singleton logger menggunakan Pino.
 * Di-config agar kompatibel dengan Next.js App Router server runtime.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { env: process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

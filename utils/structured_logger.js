// Structured logging utility for browser extension
// Mirrors @carousellabs/observability patterns for browser environment

class StructuredLogger {
  constructor(context = {}) {
    this.context = context;
    this.isDev = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');
  }

  _formatLog(level, message, extra = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      context: this.context,
      ...extra,
      // Browser-specific context
      userAgent: navigator.userAgent,
      url: (typeof window !== 'undefined' && window.location?.href) || 'service-worker',
      extension: {
        id: chrome?.runtime?.id || 'unknown',
        version: chrome?.runtime?.getManifest?.()?.version || 'unknown'
      }
    };

    return logEntry;
  }

  _emit(level, message, extra = {}) {
    const logEntry = this._formatLog(level, message, extra);
    
    // Console output with structured format
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warn' ? 'warn' : 
                         level === 'debug' ? 'debug' : 'log';
    
    if (this.isDev) {
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, logEntry);
    } else {
      // In production, only log errors and important events
      if (level === 'error' || level === 'warn') {
        console[consoleMethod](`[${level.toUpperCase()}] ${message}`, logEntry);
      }
    }

    // Store in chrome storage for telemetry (optional)
    this._storeForTelemetry(logEntry);
  }

  async _storeForTelemetry(logEntry) {
    try {
      // Store recent logs for debugging (keep last 100 entries)
      const stored = await this._getStoredLogs();
      const logs = stored.logs || [];
      logs.push(logEntry);
      
      // Keep only last 100 entries
      const recentLogs = logs.slice(-100);
      
      await chrome.storage.local.set({ 
        structured_logs: { 
          logs: recentLogs,
          lastUpdated: Date.now()
        }
      });
    } catch (error) {
      // Silent fail - don't break the app if logging fails
      console.warn('Failed to store log entry:', error);
    }
  }

  async _getStoredLogs() {
    try {
      const result = await chrome.storage.local.get(['structured_logs']);
      return result.structured_logs || { logs: [] };
    } catch {
      return { logs: [] };
    }
  }

  // Log levels
  info(message, extra = {}) {
    this._emit('info', message, extra);
  }

  warn(message, extra = {}) {
    this._emit('warn', message, extra);
  }

  error(message, extra = {}) {
    this._emit('error', message, extra);
  }

  debug(message, extra = {}) {
    this._emit('debug', message, extra);
  }

  // Specific logging methods for common browser extension events
  userAction(action, details = {}) {
    this.info(`User action: ${action}`, {
      category: 'user_action',
      action,
      ...details
    });
  }

  apiCall(method, url, duration, status, details = {}) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this._emit(level, `API ${method} ${url}`, {
      category: 'api_call',
      method,
      url,
      duration_ms: duration,
      status,
      ...details
    });
  }

  memoryOperation(operation, success, details = {}) {
    const level = success ? 'info' : 'error';
    this._emit(level, `Memory ${operation}`, {
      category: 'memory_operation',
      operation,
      success,
      ...details
    });
  }

  authentication(event, success, details = {}) {
    const level = success ? 'info' : 'error';
    this._emit(level, `Auth ${event}`, {
      category: 'authentication',
      event,
      success,
      ...details
    });
  }

  performance(metric, value, details = {}) {
    this.info(`Performance: ${metric}`, {
      category: 'performance',
      metric,
      value,
      ...details
    });
  }

  // Create a child logger with additional context
  child(additionalContext = {}) {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext
    });
  }

  // Get stored logs for debugging/telemetry
  async getLogs(limit = 50) {
    const stored = await this._getStoredLogs();
    return stored.logs.slice(-limit);
  }

  // Clear stored logs
  async clearLogs() {
    try {
      await chrome.storage.local.remove(['structured_logs']);
    } catch (error) {
      console.warn('Failed to clear logs:', error);
    }
  }
}

// Create default logger instance
const logger = new StructuredLogger({
  service: 'carousellabs-memory-extension',
  version: chrome?.runtime?.getManifest?.()?.version || 'unknown'
});

// Export for use in other files
export { StructuredLogger, logger };

// Also make available globally for content scripts
// Export for different environments
if (typeof window !== 'undefined') {
  window.CarouselLabsLogger = { StructuredLogger, logger };
} else if (typeof globalThis !== 'undefined') {
  globalThis.CarouselLabsLogger = { StructuredLogger, logger };
}

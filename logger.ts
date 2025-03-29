// logger.ts - Unified Logging Solution

import Instabug, { CrashReporting } from "instabug-reactnative";

/**
 * Log levels in order of severity
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    CRASH = 'crash',
    NONE = 'none', //disable logging
}

/**
 * Available log destinations
 */
export enum LogDestination {
    CONSOLE = 'console',
    INSTABUG = 'instabug',
    CRASH_REPORTING = 'crash_reporting',
    REMOTE = 'remote',
    FILE = 'file',
}

/**
 * Interface for crash report data
 */
export interface CrashReportData {
    name: string;
    message: string;
    cause?: any;
    stack?: string;
    [key: string]: any;
}

/**
 * Interface for log data
 */
export interface LogData {
    [key: string]: any;
}

/**
 * Interface for logger context
 */
export interface LoggerContext {
    [key: string]: any;
}

/**
 * Interface for file logging configuration
 */
export interface FileConfig {
    write: (data: any) => void;
    [key: string]: any;
}

/**
 * Type for log formatter function
 */
export type LogFormatter = (
    timestamp: string,
    level: LogLevel,
    message: string,
    data: LogData,
    context: LoggerContext
) => any;

/**
 * Interface for formatters map
 */
interface FormattersMap {
    [key: string]: LogFormatter;
}

/**
 * Logger configuration class
 */
class LoggerConfig {
    minLevel: LogLevel;
    destinations: LogDestination[];
    context: LoggerContext;
    enabled: boolean;
    formatters: FormattersMap;
    remoteUrl: string | null;
    fileConfig: FileConfig | null;

    constructor() {
        // Default configuration
        this.minLevel = LogLevel.INFO;
        this.destinations = [LogDestination.CONSOLE];
        this.context = {};
        this.enabled = true;
        this.formatters = {};
        this.remoteUrl = null;
        this.fileConfig = null;
    }

    /**
     * Set minimum log level
     * @param level - Minimum log level to display
     * @returns This config instance for chaining
     */
    setMinLevel(level: LogLevel): LoggerConfig {
        this.minLevel = level;
        return this;
    }

    /**
     * Set log destinations
     * @param destinations - Array of destinations
     * @returns This config instance for chaining
     */
    setDestinations(destinations: LogDestination[]): LoggerConfig {
        this.destinations = destinations;
        return this;
    }

    /**
     * Add global context that will be included with every log
     * @param context - Context object to add
     * @returns This config instance for chaining
     */
    setContext(context: LoggerContext): LoggerConfig {
        this.context = { ...this.context, ...context };
        return this;
    }

    /**
     * Enable or disable logging
     * @param enabled - Whether logging is enabled
     * @returns This config instance for chaining
     */
    setEnabled(enabled: boolean): LoggerConfig {
        this.enabled = enabled;
        return this;
    }

    /**
     * Set custom formatter for a destination
     * @param destination - Destination to set formatter for
     * @param formatter - Formatter function
     * @returns This config instance for chaining
     */
    setFormatter(destination: LogDestination, formatter: LogFormatter): LoggerConfig {
        this.formatters[destination] = formatter;
        return this;
    }

    /**
     * Configure remote logging
     * @param url - URL to send logs to
     * @returns This config instance for chaining
     */
    setRemoteUrl(url: string): LoggerConfig {
        this.remoteUrl = url;
        return this;
    }

    /**
     * Configure file logging
     * @param fileConfig - File logging configuration
     * @returns This config instance for chaining
     */
    setFileConfig(fileConfig: FileConfig): LoggerConfig {
        this.fileConfig = fileConfig;
        return this;
    }
}

/**
 * Interface for level priority mapping
 */
interface LevelPriorityMap {
    [key: string]: number;
}

/**
 * Main Logger class
 */
class Logger {
    config: LoggerConfig;
    levelPriority: LevelPriorityMap;

    constructor() {
        this.config = new LoggerConfig();
        this.levelPriority = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 1,
            [LogLevel.WARN]: 2,
            [LogLevel.ERROR]: 3,
            [LogLevel.CRASH]: 4,
            [LogLevel.NONE]: 5,
        };
    }

    /**
     * Get the logger configuration
     * @returns Current configuration
     */
    getConfig(): LoggerConfig {
        return this.config;
    }

    /**
     * Check if a log level should be processed
     * @param level - Log level to check
     * @returns Whether the level should be processed
     */
    shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) return false;
        return this.levelPriority[level] >= this.levelPriority[this.config.minLevel];
    }

    /**
     * Format a log message for a specific destination
     * @param destination - Log destination
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional log data
     * @returns Formatted log for the destination
     */
    formatLog(destination: LogDestination, level: LogLevel, message: string, data: LogData): any {
        const timestamp = new Date().toISOString();
        const context = { ...this.config.context };

        // Use custom formatter if available
        if (this.config.formatters[destination]) {
            return this.config.formatters[destination](timestamp, level, message, data, context);
        }

        // Default formatters
        switch (destination) {
            case LogDestination.CONSOLE:
                return {
                    timestamp,
                    level,
                    message,
                    ...data,
                    ...context,
                };

            case LogDestination.INSTABUG:
                return `${level.toUpperCase()}: ${message} ${JSON.stringify({ ...data, ...context })}`;

            case LogDestination.REMOTE:
            case LogDestination.FILE:
                return {
                    timestamp,
                    level,
                    message,
                    data,
                    context,
                };

            default:
                return message;
        }
    }

    /**
     * Send a log to a specific destination
     * @param destination - Log destination
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional log data
     */
    async sendToDestination(destination: LogDestination, level: LogLevel, message: string, data: LogData): Promise<void> {
        const formattedLog = this.formatLog(destination, level, message, data);

        switch (destination) {
            case LogDestination.CONSOLE:
                switch (level) {
                    case LogLevel.DEBUG:
                        console.debug(formattedLog);
                        break;
                    case LogLevel.INFO:
                        console.info(formattedLog);
                        break;
                    case LogLevel.WARN:
                        console.warn(formattedLog);
                        break;
                    case LogLevel.ERROR:
                    case LogLevel.CRASH:
                        console.error(formattedLog);
                        break;
                }
                break;

            case LogDestination.INSTABUG:
                switch (level) {
                    case LogLevel.DEBUG:
                    case LogLevel.INFO:
                        Instabug.logInfo(formattedLog);
                        break;
                    case LogLevel.WARN:
                        Instabug.logWarn(formattedLog);
                        break;
                    case LogLevel.ERROR:
                    case LogLevel.CRASH:
                        Instabug.logError(formattedLog);
                        break;
                }
                break;

            case LogDestination.REMOTE:
                if (this.config.remoteUrl) {
                    try {
                        await fetch(this.config.remoteUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(formattedLog),
                        });
                    } catch (e) {
                        // Fallback to console if remote logging fails
                        console.error('Remote logging failed:', e);
                    }
                }
                break;

            case LogDestination.FILE:
                // Implementation would depend on platform (React Native, Node.js, etc.)
                if (this.config.fileConfig && typeof this.config.fileConfig.write === 'function') {
                    this.config.fileConfig.write(formattedLog);
                }
                break;
        }
    }

    /**
     * Log a message at a specific level
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional log data
     * @param destinations - Optional specific destinations for this log
     */
    async log(
        level: LogLevel,
        message: string,
        data: LogData = {},
        destinations?: LogDestination[]
    ): Promise<void> {
        if (!this.shouldLog(level)) return;

        try {
            // Use provided destinations or default to configured destinations
            const loggingDestinations = destinations || this.config.destinations;

            for (const destination of loggingDestinations) {
                await this.sendToDestination(destination, level, message, data);
            }
        } catch (e) {
            console.error('Logging failed:', e);
        }
    }

    /**
     * Log a debug message
     * @param message - Log message
     * @param data - Additional log data
     * @param destinations - Optional specific destinations for this log
     */
    debug(message: string, data?: LogData, destinations?: LogDestination[]): void {
        this.log(LogLevel.DEBUG, message, data, destinations);
    }

    /**
     * Log an info message
     * @param message - Log message
     * @param data - Additional log data
     * @param destinations - Optional specific destinations for this log
     */
    info(message: string, data?: LogData, destinations?: LogDestination[]): void {
        this.log(LogLevel.INFO, message, data, destinations);
    }

    /**
     * Log a warning message
     * @param message - Log message
     * @param data - Additional log data
     * @param destinations - Optional specific destinations for this log
     */
    warn(message: string, data?: LogData, destinations?: LogDestination[]): void {
        this.log(LogLevel.WARN, message, data, destinations);
    }

    /**
     * Log an error message
     * @param message - Log message
     * @param data - Additional log data
     * @param destinations - Optional specific destinations for this log
     */
    error(message: string, data?: LogData, destinations?: LogDestination[]): void {
        this.log(LogLevel.ERROR, message, data, destinations);
    }

    /**
     * Log only to console
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional log data
     */
    console(level: LogLevel, message: string, data: LogData = {}): void {
        this.log(level, message, data, [LogDestination.CONSOLE]);
    }

    /**
     * Log only to Instabug
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional log data
     */
    instabug(level: LogLevel, message: string, data: LogData = {}): void {
        this.log(level, message, data, [LogDestination.INSTABUG]);
    }

    /**
     * Convenience method to log debug messages to console only
     */
    consoleDebug(message: string, data: LogData = {}): void {
        this.console(LogLevel.DEBUG, message, data);
    }

    /**
     * Convenience method to log info messages to console only
     */
    consoleInfo(message: string, data: LogData = {}): void {
        this.console(LogLevel.INFO, message, data);
    }

    /**
     * Convenience method to log warning messages to console only
     */
    consoleWarn(message: string, data: LogData = {}): void {
        this.console(LogLevel.WARN, message, data);
    }

    /**
     * Convenience method to log error messages to console only
     */
    consoleError(message: string, data: LogData = {}): void {
        this.console(LogLevel.ERROR, message, data);
    }

    /**
     * Convenience method to log info messages to Instabug only
     */
    instabugInfo(message: string, data: LogData = {}): void {
        this.instabug(LogLevel.INFO, message, data);
    }

    /**
     * Convenience method to log warning messages to Instabug only
     */
    instabugWarn(message: string, data: LogData = {}): void {
        this.instabug(LogLevel.WARN, message, data);
    }

    /**
     * Convenience method to log error messages to Instabug only
     */
    instabugError(message: string, data: LogData = {}): void {
        this.instabug(LogLevel.ERROR, message, data);
    }

    /**
     * Log a user event to Instabug
     * @param eventName - Name of the user event
     * @param data - Additional data about the event
     */
    logUserEvent(eventName: string, data: LogData = {}): void {
        this.instabugInfo(`USER EVENT: ${eventName}`, data);
        Instabug.logUserEvent(eventName);
    }

    /**
     * Report a crash or serious error
     * This will both log the error and send it to crash reporting
     * 
     * @param errorName - Name of the error
     * @param errorMessage - Error message
     * @param data - Additional data about the error
     */
    reportCrash(errorName: string, errorMessage: string, data: LogData = {}): void {
        // Extract stack if it exists in the data
        const stack = data.stack || "No stack trace";

        // Log the error through the normal logging system
        this.log(LogLevel.CRASH, `CRASH: ${errorName} - ${errorMessage}`, data);

        // Always send to crash reporting regardless of destinations
        try {
            CrashReporting.reportError({
                name: errorName,
                message: errorMessage,
                cause: data.cause || data,
                stack: stack,
            });
        } catch (e) {
            console.error('Failed to report crash:', e);
        }
    }
}

// Create and export singleton instance
const log = new Logger();

/**
 * Initialize logger with application-wide context
 * Call this once during app startup
 * 
 * @param isDev - Whether the app is running in development mode
 * @param appInfo - Application information to include in logs
 */
export function initLogger(isDev: boolean, appInfo: {
    platform: string;
    [key: string]: any;
}): void {
    try {
        // Configure destinations
        log.config.destinations = [LogDestination.CONSOLE, LogDestination.INSTABUG];

        // Set common context
        log.config.context = { ...log.config.context, ...appInfo };

        // Configure log level based on environment
        log.config.minLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;

        // Log initialization
        console.log('Logging system initialized'); // Fallback log
        log.info('Logging initialized', appInfo);
    } catch (e) {
        // Fallback to console if there's an error during initialization
        console.error('Error initializing logging system:', e);
    }
}

// Export the logger
export default log;
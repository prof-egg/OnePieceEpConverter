/******************************************************************************
 *  Debug - A static library for sending debugging customly 
 *  formatted strings to the console.
 * 
 *  EColorEscape - An enum containing terminal escape sequences.
 *
 ******************************************************************************/

/**
 * The `Debug` class provides static methods for 
 * sending debug messages to the console.
 */
export default class Debug {
    
    /**
     * Logs a purple colored message to the console which supersedes
     * a time stamp and logger/loggerType message
     * @param {string} message the message you want to log
     * @param {string} logger the id of what logged the message
     */
    public static logStartup(message: string, logger?: string): void {
        this.colorLog(this.composeLogString(message, "STARTUP", logger), EColorEscape.MagentaFG)
    }

    /**
     * Logs a green colored message to the console which supersedes
     * a time stamp and logger/loggerType message
     * @param {string} message the message you want to log
     * @param {string} logger the id of what logged the message
     */
    public static logImportant(message: string, logger?: string): void {
        this.colorLog(this.composeLogString(message, "IMPORTANT", logger), EColorEscape.GreenFG)
    }

    /**
     * Logs a red colored message to the console which supersedes
     * a time stamp and logger/loggerType message
     * @param {string} message the message you want to log
     * @param {string} logger the id of what logged the message
     */
    public static logError(message: string, logger?: string): void {
        this.colorLog(this.composeLogString(message, "ERROR", logger), EColorEscape.RedFG)
    }

    /**
     * Logs a yellow colored message to the console which supersedes
     * a time stamp and logger/loggerType message
     * @param {string} message the message you want to log
     * @param {string} logger the id of what logged the message
     */
    public static logWarning(message: string, logger?: string): void {
        this.colorLog(this.composeLogString(message, "WARNING", logger), EColorEscape.YellowFG)
    }

    /**
     * Logs an optionally colored message to the console which 
     * supersedes a time stamp and logger/loggerType message 
     * @param {string} message the message you want to log
     * @param {string} logger the id of what logged the message
     * @param {EColorEscape} color the color you want the message to be
     */
    public static log(message: string, logger?: string, color?: EColorEscape): void {
        if (!color) color = EColorEscape.Reset
        this.colorLog(this.composeLogString(message, "INFO", logger), color)
    }
    
    /***************************************************************************
    * Helper Functions
    ***************************************************************************/
    private static colorLog(message: string, color: EColorEscape): void {
        console.log(`${color}${message}${EColorEscape.Reset}`)
    }

    private static composeLogString(message: string, type: string, logger?: string): string {
        logger = (logger === undefined) ? "unknown" : logger
        return `[${this.composeTimeStamp()}] [${logger}/${type}]: ${message}`
    }

    private static composeTimeStamp(): string {

        const padLength = 2

        // Definitely not chatgpt code
        const date = new Date()
        const month = (date.getMonth() + 1).toString().padStart(padLength, "0") // Add leading zero if needed
        const day = date.getDate().toString().padStart(padLength, "0")          // Add leading zero if needed
        const year = date.getFullYear()
        const hours = date.getHours() % 12 || 12                                // Convert to 12-hour format
        const minutes = date.getMinutes().toString().padStart(padLength, "0")   // Add leading zero if needed
        const ampm = (date.getHours() >= 12) ? "pm" : "am"                      // Determine AM/PM

        return `${month}/${day}/${year}-${hours}:${minutes}${ampm}`
    }
}

/**
 * The `EColorEscape` enum contains escape 
 * sequences applying to the terminal.
 */
export enum EColorEscape {
    Reset = "\x1b[0m",
    Bright = "\x1b[1m",
    Dim = "\x1b[2m",
    Underscore = "\x1b[4m",
    Blink = "\x1b[5m",
    Reverse = "\x1b[7m",
    Hidden = "\x1b[8m",

    // Foreground (text) colors
    BlackFG = "\x1b[30m",
    RedFG = "\x1b[31m",
    GreenFG = "\x1b[32m",
    YellowFG = "\x1b[33m",
    BlueFG = "\x1b[34m",
    MagentaFG = "\x1b[35m",
    CyanFG = "\x1b[36m",
    WhiteFG = "\x1b[37m",
    CrimsonFG = "\x1b[38m",

    // Background colors
    BlackBG = "\x1b[40m",
    RedBG = "\x1b[41m",
    GreenBG = "\x1b[42m",
    YellowBG = "\x1b[43m",
    BlueBG = "\x1b[44m",
    MagentaBG = "\x1b[45m",
    CyanBG = "\x1b[46m",
    WhiteBG = "\x1b[47m",
    CrimsonBG = "\x1b[48m"
}
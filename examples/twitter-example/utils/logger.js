"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantumLogger = void 0;
// Create src/utils/logger.ts
class QuantumLogger {
    static log(msg, level = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`⌛ [${timestamp}] [${level.toUpperCase()}] ${msg.toLowerCase()}`);
    }
}
exports.QuantumLogger = QuantumLogger;
//# sourceMappingURL=logger.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurableLogger = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 4] = "SILENT";
})(LogLevel || (LogLevel = {}));
var ConfigurableLogger = /** @class */ (function () {
    function ConfigurableLogger() {
        console.log('Logger created');
    }
    ConfigurableLogger.prototype.info = function (message) {
        console.log(message);
    };
    return ConfigurableLogger;
}());
exports.ConfigurableLogger = ConfigurableLogger;

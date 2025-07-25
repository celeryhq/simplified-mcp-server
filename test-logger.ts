enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export class ConfigurableLogger {
  constructor() {
    console.log('Logger created');
  }
  
  info(message: string) {
    console.log(message);
  }
}
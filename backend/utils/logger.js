const { format } = require('util');

class Logger {
  constructor(prefix = 'StoryClip') {
    this.prefix = prefix;
  }

  _formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = format(message, ...args);
    return `[${timestamp}] [${this.prefix}] [${level}] ${formattedMessage}`;
  }

  info(message, ...args) {
    console.log(this._formatMessage('INFO', message, ...args));
  }

  warn(message, ...args) {
    console.warn(this._formatMessage('WARN', message, ...args));
  }

  error(message, ...args) {
    console.error(this._formatMessage('ERROR', message, ...args));
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this._formatMessage('DEBUG', message, ...args));
    }
  }

  success(message, ...args) {
    console.log(this._formatMessage('SUCCESS', message, ...args));
  }
}

module.exports = new Logger();


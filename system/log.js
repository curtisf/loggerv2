import winston from 'winston'

const log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
      colorize: true, // because having a log message be all of one color is annoying.
      level: 'verbose',
      humanReadableUnhandledException: true,
      json: false
    })
  ],
  exitOnError: true
})

export { log }

import { bot, Redis, Dog } from '../Logger'
import { loadToRedis } from '../handlers/read'
import path from 'path'
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()

const dir = require('require-all')(path.join(__dirname, '/../events'))
function handle (type, data, guildID, channelID) {
  if (Config.datadog.use) {
    Dog.increment('total_events.int')
  }
  if (guildID && type !== 'messageCreate') {
    if (channelID) {
      Redis.existsAsync(`${guildID}:ignoredChannels`).then((exist) => {
        if (exist) {
          Redis.getAsync(`${guildID}:ignoredChannels`).then((channels) => {
            if (channels.split(',').indexOf(channelID) === -1) {
              Redis.getAsync(`${guildID}:disabledEvents`).then((dEvents) => {
                if (dEvents.split(',').indexOf(type) === -1) {
                  try {
                    dir[type].run(bot, data)
                  } catch (_) {}
                }
              })
            }
          })
        } else {
          loadToRedis(guildID)
        }
      })
    } else {
      Redis.existsAsync(`${guildID}:disabledEvents`).then((res) => {
        if (res) {
          Redis.getAsync(`${guildID}:disabledEvents`).then((dEvents) => {
            if (dEvents.split(',').indexOf(type) === -1) {
              try {
                dir[type].run(bot, data)
              } catch (_) {}
            }
          })
        } else {
          loadToRedis(guildID)
        }
      })
    }
  } else {
    if (Object.keys(dir).indexOf(type) !== -1) {
      try {
        dir[type].run(bot, data)
      } catch (_) {}
    }
  }
}

export { handle }

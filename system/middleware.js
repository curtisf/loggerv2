import { bot, Redis, Dog } from '../Logger'
import { loadToRedis } from '../handlers/read'
import path from 'path'
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()

const dir = require('require-all')(path.join(__dirname, '/../events'))
let total = 0

function handle (type, data, guildID, channelID) {
  if (Config.datadog.use) {
    total = total + 1
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
              } catch (e) {
                console.error(e)
              }
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

if (Config.datadog.use) {
  setInterval(() => {
    Dog.incrementBy('total_events.int', total)
    Dog.gauge('total_users', bot.users.size)
    Dog.gauge('bot_uptime', bot.uptime)
    total = 0
  }, 15000)
}

export { handle }

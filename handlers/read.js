import { bot, Redis } from '../Logger'
import { log } from '../system/log'
import { recoverGuild } from './create'
import { r } from '../system/rethinkclient'
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()

function getLogChannel (guildID) {
  return new Promise((resolve, reject) => {
    Redis.existsAsync(`${guildID}:logchannel`).then((res) => {
      if (res) {
        Redis.getAsync(`${guildID}:logchannel`).then((channelID) => {
          let channel
          if (bot.guilds.get(guildID)) {
            channel = bot.guilds.get(guildID).channels.get(channelID)
          }
          if (channel) {
            resolve(channel)
          } else {
            addChannelToRedis(guildID, resolve)
          }
        })
      } else {
        addChannelToRedis(guildID, resolve)
      }
    })
  })
}

function addChannelToRedis (guildID, cb) {
  r.db('Logger').table('Guilds').get(guildID).run().then((doc) => {
    if (doc) {
      Redis.set(`${guildID}:ignoredChannels`, doc.ignoredChannels.toString())
      Redis.set(`${guildID}:disabledEvents`, doc.disabledEvents.toString())
      if (doc.logchannel) {
        let channel = bot.guilds.get(guildID).channels.get(doc.logchannel)
        if (channel) {
          Redis.del(`${guildID}:logchannel`)
          Redis.set(`${guildID}:logchannel`, doc.logchannel.toString()) // no need to expire.
          cb(bot.guilds.get(guildID).channels.get(doc.logchannel))
        } else {
          cb(false) // eslint-disable-line
        }
      } else {
        cb(false) // eslint-disable-line
      }
    } else {
      log.warn(`Missing doc for guild id ${guildID}, recovering.`)
      recoverGuild(guildID)
      cb(false) // eslint-disable-line
    }
  })
}

function getUserDocument (userID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Users').get(userID).run().then((doc) => {
      if (doc) {
        resolve(doc)
      } else {
        resolve(false)
      }
    })
  })
}

function getGuildDocument (guildID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).run().then((doc) => {
      if (doc) {
        resolve(doc)
      } else {
        resolve(false)
        recoverGuild(guildID)
      }
    })
  })
}

function loadToRedis (guildID) {
  r.db('Logger').table('Guilds').get(guildID).run().then((doc) => {
    if (doc) {
      Redis.set(`${guildID}:ignoredChannels`, doc.ignoredChannels.toString())
      Redis.set(`${guildID}:disabledEvents`, doc.disabledEvents.toString())
      Redis.del(`${guildID}:logchannel`)
      Redis.set(`${guildID}:logchannel`, doc.logchannel.toString()) // no need to expire.
    } else {
      log.warn(`Missing doc for guild id ${guildID}, recovering.`)
      recoverGuild(guildID)
    }
  })
}

export { getLogChannel, getUserDocument, getGuildDocument, loadToRedis }

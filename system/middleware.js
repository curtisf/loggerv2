import { bot, Redis } from '../Logger'
import { loadToRedis } from '../handlers/read'
import path from 'path'

const dir = require('require-all')(path.join(__dirname, '/../events'))
function handle (type, raw) {
  let channelID
  let guildID
  switch (type) {
    case 'MESSAGE_DELETE':
      if (raw.message) {
        if (!raw.message.isPrivate) {
          channelID = raw.message.channel.id
          guildID = raw.message.guild.id
        }
      }
      break
    case 'MESSAGE_UPDATE':
      if (raw.message) {
        if (!raw.message.isPrivate) {
          channelID = raw.message.channel.id
          guildID = raw.message.guild.id
        }
      }
      break
    case 'MESSAGE_DELETE_BULK':
      if (raw.messages.length !== 0 && !raw.messages[0].isPrivate) {
        channelID = raw.channelId
        guildID = raw.messages[0].guild.id
      }
      break
    case 'CHANNEL_UPDATE':
      if (raw.channel.guild) {
        channelID = raw.channel.id
        guildID = raw.channel.guild.id
      }
      break
    case 'CHANNEL_DELETE':
      channelID = raw.channelId
      guildID = raw.data.guild_id
      break
  }
  if (guildID && channelID) {
    Redis.existsAsync(`${guildID}:ignoredChannels`).then((exist) => {
      if (exist) {
        Redis.getAsync(`${guildID}:ignoredChannels`).then((channels) => {
          if (channels.split(', ').indexOf(channelID) === -1) {
            Redis.existsAsync(`${guildID}:disabledEvents`).then((res) => {
              if (res) {
                Redis.getAsync(`${guildID}:disabledEvents`).then((dEvents) => {
                  if (dEvents.split(', ').map(m => m.toUpperCase()).indexOf(type) === -1) {
                    try {
                      dir[type].run(bot, raw, type)
                    } catch (_) {}
                  }
                })
              } else {
                loadToRedis(guildID)
              }
            })
          }
        })
      } else {
        loadToRedis(guildID)
      }
    })
  } else {
    if (Object.keys(dir).indexOf(type) !== -1) {
      try {
        dir[type].run(bot, raw)
      } catch (_) {}
    }
  }
}

export { handle }

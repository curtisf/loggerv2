import { bot, Redis } from '../Logger'
import { log } from '../system/log'
import { recoverGuild } from './create'
import { updateGuildDocument } from './update'
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

function updateOverview (guildID) {
  let guild = bot.guilds.get(guildID)
  Redis.existsAsync(`${guild.id}:overviewID`).then((res) => {
    if (res) {
      Redis.getAsync(`${guild.id}:overviewID`).then((overview) => {
        if (overview) {
          let split = overview.split('|')
          let channelID = split[0]
          let messageID = split[1]
          let fields = [
            {
              'name': 'Member Count',
              'value': `► **${guild.memberCount}** total\n► **${guild.members.filter(m => !m.bot).length}** humans\n► **${guild.members.filter(m => m.bot).length}** bots`
            },
            {
              'name': 'Channels',
              'value': `► **${guild.channels.filter(c => c.type === 4).length}** categories/category\n► **${guild.channels.filter(c => c.type === 0).length}** text channels\n► **${guild.channels.filter(c => c.type === 2).length}** voice channels`
            },
            {
              'name': 'Role Count',
              'value': `► ${guild.roles.size}`
            }
          ]
          guild.getBans().then((b, banserror) => {
            guild.getAuditLogs(1, null, 22).then((log, auditerror) => {
              log = log.entries[0]
              let user = log.user
              bot.getRESTUser(log.targetID).then((affected) => {
                log.guild = []
                if (banserror || auditerror) {
                  fields.push({
                    'name': 'Ban Count',
                    'value': 'Missing Permissions'
                  })
                } else {
                  fields.push({
                    'name': 'Ban Count',
                    'value': `${b.length === 0 ? '0' : `**${b.length}** | Latest Ban: **${affected.username}#${affected.discriminator}** by **${user.username}#${user.discriminator}**${log.reason ? ` for *${log.reason}*` : ' with no reason specified.'}`}`
                  })
                }
                bot.editMessage(channelID, messageID, {
                  content: '**Live Stats**',
                  embed: {
                    'title': `${guild.name}`,
                    'description': 'I will update with events that occur',
                    'color': 7923697,
                    'timestamp': new Date(),
                    'footer': {
                      'icon_url': bot.users.get(guild.ownerID).avatarURL ? bot.users.get(guild.ownerID).avatarURL : bot.users.get(guild.ownerID).defaultAvatarURL,
                      'text': `${bot.users.get(guild.ownerID).username}#${bot.users.get(guild.ownerID).discriminator}`
                    },
                    'thumbnail': {
                      'url': guild.iconURL ? guild.iconURL : 'https://static1.squarespace.com/static/5937e362be659441f72e7c12/t/595120eadb29d60c5983e4a2/1498489067243/Sorry-image-not-available.png'
                    },
                    'fields': fields
                  }
                }).catch(() => {
                  updateGuildDocument(guild.id, { 'overviewID': '' }).then((res) => {
                    if (res === true) {
                      loadToRedis(guild.id)
                    }
                  })
                })
              })
            })
          })
        }
      })
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
      if (!doc.logBots || !doc.overviewID) {
        updateGuildDocument(guildID, { 'logBots': doc.logBots !== undefined ? doc.logBots : '', 'overviewID': doc.overviewID !== undefined ? doc.overviewID : '' }).then(() => {
          Redis.set(`${guildID}:ignoredChannels`, doc.ignoredChannels.toString())
          Redis.set(`${guildID}:disabledEvents`, doc.disabledEvents.toString())
          Redis.del(`${guildID}:logchannel`)
          Redis.set(`${guildID}:logchannel`, doc.logchannel.toString()) // no need to expire.
          Redis.set(`${guildID}:overviewID`, '')
          Redis.set(`${guildID}:logBots`, '')
        })
      } else {
        Redis.set(`${guildID}:ignoredChannels`, doc.ignoredChannels.toString())
        Redis.set(`${guildID}:disabledEvents`, doc.disabledEvents.toString())
        Redis.del(`${guildID}:logchannel`)
        Redis.set(`${guildID}:logchannel`, doc.logchannel.toString()) // no need to expire.
        Redis.set(`${guildID}:overviewID`, doc.overviewID)
        Redis.set(`${guildID}:logBots`, doc.logBots)
      }
    } else {
      log.warn(`Missing doc for guild id ${guildID}, recovering.`)
      recoverGuild(guildID)
    }
  })
}

export { getLogChannel, getUserDocument, getGuildDocument, loadToRedis, updateOverview }

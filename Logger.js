import bluebird from 'bluebird'
import Eris from 'eris'
import { log } from './system/log'
import redis from 'redis'
import * as request from 'superagent'
import spawn from 'cross-spawn'
import { getUserDocument, loadToRedis } from './handlers/read'
const util = require('util')

process.title = 'Logger v2.5'

let argv = require('minimist')(process.argv.slice(2))

if (argv.token) {
  log.info(`Shard mode enabled, assigned shard id: ${argv.shardid}`)
}

const Config = require('./botconfig.json')
let bot
if (argv.token) {
  bot = new Eris(argv.token, {
    getAllUsers: true,
    firstShardID: argv.shardid,
    lastShardID: argv.shardid,
    maxShards: argv.shardtotal,
    restMode: true
  })
} else {
  bot = new Eris(Config.core.token, {
    getAllUsers: true,
    restMode: true
  })
}
bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const Redis = redis.createClient()
const middleware = require('./system/middleware').handle
const Raven = require('raven')
Raven.config(Config.raven.url).install()

let restarts = 0

init()

bot.on('ready', () => {
  log.info('Connected to the Discord Gateway.')
  if (Config.misc.defaultGame) {
    bot.editStatus('online', {
      name: `${Config.misc.defaultGame}`
    })
  }
  bot.getSelf().then((user) => {
    postToDbots(bot.guilds.size)
    log.info(`Hello Discord! I'm ${argv.token ? `shard ${argv.shardid} ` : ''}${user.username}#${user.discriminator} (${user.id}), in ${bot.guilds.size} servers with ${bot.users.size} known members.`)
  })
  if (process.send) {
    process.send({
      op: 'HELLO',
      shardID: argv.shardid,
      guildCount: bot.guilds.size,
      userCount: bot.users.size
    })
  }
})

bot.on('disconnect', () => {
  init()
})

bot.on('error', (e) => {
  log.error(`Shard ${argv.token ? argv.shardid : 0} encountered an error!`, e)
  Raven.captureException(e, {level: 'shardError'})
})

function init() {
  if (restarts === 0) {
    bot.connect()
    log.info('Booting up, no restarts...')
    restarts++
  } else if (restarts <= 10) {
    bot.connect()
    log.info(`Booting up... ${restarts} restarts.`)
    restarts++
  } else {
    log.error('Maximum amount of restarts reached, refusing to reconnect.')
  }
}

bot.on('channelCreate', (c) => {
  let channel = bot.getChannel(c.id)
  if ((!channel.recipient || !channel.recipients) && channel.guild) {
    middleware('channelCreate', channel, channel.guild.id)
  }
})

bot.on('channelUpdate', (newChannel, oldChannel) => {
  let c = {}
  c.newChannel = newChannel
  c.oldChannel = oldChannel
  if (newChannel.guild) {
    middleware('channelUpdate', c, newChannel.guild.id, newChannel.id)
  }
})

bot.on('channelDelete', (channel) => {
  if (channel.guild) {
    middleware('channelDelete', channel, channel.guild.id)
  }
})

bot.on('guildBanAdd', (guild, user) => {
  let g = {}
  g.guild = guild
  g.user = user
  middleware('guildBanAdd', g, guild.id)
})

bot.on('guildBanRemove', (guild, user) => {
  let g = {}
  g.guild = guild
  g.user = user
  middleware('guildBanRemove', g, guild.id)
})

bot.on('guildCreate', (guild) => {
  if (guild.memberCount > 5) {
    middleware('guildCreate', guild)
  } else {
    guild.leave()
  }
})

bot.on('guildDelete', (guild) => {
  middleware('guildDelete', guild)
})

bot.on('guildRoleCreate', (guild, role) => {
  let g = {}
  g.guild = guild
  g.role = role
  middleware('guildRoleCreate', g, guild.id)
})

bot.on('guildRoleDelete', (guild, role) => {
  let g = {}
  g.guild = guild
  g.role = role
  middleware('guildRoleDelete', g, guild.id)
})

bot.on('guildRoleUpdate', (guild, newRole, oldRole) => {
  let g = {}
  g.guild = guild
  g.newRole = newRole
  g.oldRole = oldRole
  middleware('guildRoleUpdate', g, guild.id)
})

bot.on('guildUpdate', (newGuild, oldGuild) => {
  let g = {}
  g.newGuild = newGuild
  g.oldGuild = oldGuild
  middleware('guildUpdate', g, newGuild.id)
})

bot.on('messageCreate', (message) => {
  if (message.channel.guild) {
    middleware('messageCreate', message, message.channel.guild.id, message.channel.id)
  }
})

bot.on('messageDelete', (message) => {
  if (message.channel.guild) {
    middleware('messageDelete', message, message.channel.guild.id, message.channel.id)
  }
})

bot.on('messageDeleteBulk', (messages) => {
  if (messages[0].content) {
    middleware('messageDeleteBulk', messages, messages[0].channel.guild.id, messages[0].channel.id)
  }
})

bot.on('messageReactionRemoveAll', (message) => {
  if (message.author) {
    middleware('messageReactionRemoveAll', message, message.channel.guild.id, message.channel.id)
  }
})

bot.on('messageUpdate', (newMessage, oldMessage) => {
  if (newMessage.channel.guild && oldMessage) {
    let m = {}
    m.newMessage = newMessage
    m.oldMessage = oldMessage
    middleware('messageUpdate', m, newMessage.channel.guild.id, newMessage.channel.id)
  }
})

bot.on('guildMemberAdd', (guild, member) => {
  let g = {}
  g.guild = guild
  g.member = member
  middleware('guildMemberAdd', g, guild.id)
})

bot.on('guildEmojisUpdate', (guild, newEmojis, oldEmojis) => {
  let g = {}
  g.guild = guild
  g.newEmojis = newEmojis
  g.oldEmojis = oldEmojis
  middleware('guildEmojisUpdate', g, guild.id)
})

bot.on('guildMemberRemove', (guild, member) => {
  if (member.username) {
    let g = {}
    g.guild = guild
    g.member = member
    if (guild.members.get(bot.user.id).permission.json['viewAuditLogs']) {
      guild.getAuditLogs(1, null, 20).then((audit) => {
        if (audit.entries.length !== 0) {
          let auditEntryDate = new Date((audit.entries[0].id / 4194304) + 1420070400000)
          if (new Date().getTime() - auditEntryDate.getTime() < 3000) {
            g.perpetrator = audit.entries[0].user
            g.reason = audit.entries[0].reason ? audit.entries[0].reason : 'None provided.'
            middleware('guildMemberKick', g, guild.id)
          } else {
            middleware('guildMemberRemove', g, guild.id)
          }
        } else {
          middleware('guildMemberRemove', g, guild.id)
        }
      }).catch(log.error)
    } else {
      middleware('guildMemberRemove', g, guild.id)
    }
  }
})

bot.on('guildMemberUpdate', (guild, member, oldMember) => {
  if (member && oldMember) {
    let g = {}
    g.guild = guild
    g.member = member
    g.oldMember = oldMember
    middleware('guildMemberUpdate', g, guild.id)
  }
})

bot.on('userUpdate', (newUser, oldUser) => {
  let g = {}
  g.user = newUser
  g.old = oldUser
  middleware('userUpdate', g)
})

bot.on('voiceChannelJoin', (member, channel) => {
  let c = {}
  c.member = member
  c.channel = channel
  middleware('voiceChannelJoin', c, channel.guild.id)
})

bot.on('voiceChannelLeave', (member, channel) => {
  let c = {}
  c.member = member
  c.channel = channel
  middleware('voiceChannelLeave', c, channel.guild.id)
})

bot.on('voiceChannelSwitch', (member, newChannel, oldChannel) => {
  let c = {}
  c.member = member
  c.newChannel = newChannel
  c.oldChannel = oldChannel
  middleware('voiceChannelSwitch', c, newChannel.guild.id)
})

bot.on('voiceStateUpdate', (member, oldState) => {
  let v = {}
  v.member = member
  v.old = oldState
  middleware('voiceStateUpdate', v, member.guild.id)
})

function postToDbots(count) {
  if (Config.stats.dbots.enabled === true) {
    request
      .post(`https://bots.discord.pw/api/bots/${Config.stats.dbots.bot_id}/stats`)
      .set(`Authorization`, `${Config.stats.dbots.token}`)
      .send({ "server_count": count }) // eslint-disable-line quotes
      .end(function (error) {
        if (error) {
          log.error('Error while posting server count to dbots!')
          log.error(error)
        } else {
          log.info(`Posted server count to dbots: ${count}`)
        }
      })
  }
}

if (process.send) {
  process.on('message', message => {
    if (message === 'Hello!') process.send('Hello!')
    message = JSON.parse(message)
    if (!message.op) {
      log.warn('Invalid request from child process, denying.', message)
    } else if (bot.ready) {
      switch (message.op) {
        case 'EVAL':
          try {
            var returned = eval(message.c) // eslint-disable-line no-eval
            var str = util.inspect(returned, {
              depth: 1
            })
            if (str.length > 1900) {
              str = str.substr(0, 1897)
              str = str + '...'
            }
            str = str.replace(new RegExp(argv.token, 'gi'), '( ͡° ͜ʖ ͡°)') // thanks doug
            if (returned !== undefined && returned !== null && typeof returned.then === 'function') {
              returned.then(() => {
                var str = util.inspect(returned, {
                  depth: 1
                })
                if (str.length > 1900) {
                  str = str.substr(0, 1897)
                  str = str + '...'
                }
                process.send(JSON.stringify({
                  op: 'EVAL_RESPONSE',
                  c: JSON.stringify(str),
                  shardID: argv.shardid
                }))
              }, (e) => {
                var str = util.inspect(e, {
                  depth: 1
                })
                if (str.length > 1900) {
                  str = str.substr(0, 1897)
                  str = str + '...'
                }
                process.send(JSON.stringify({
                  op: 'EVAL_RESPONSE',
                  c: JSON.stringify(str),
                  shardID: argv.shardid
                }))
              })
            }
          } catch (e) {
            process.send(JSON.stringify({
              op: 'EVAL_RESPONSE',
              c: JSON.stringify(e),
              shardID: argv.shardid
            }))
          }
          break
        case 'GET_USER':
          process.send(JSON.stringify({
            op: 'GET_USER_RESPONSE',
            c: JSON.stringify(bot.users.get(message.id), null, '   '),
            requestedID: message.id,
            shardID: argv.shardid
          }))
          break
        case 'GUILD_FETCH':
          process.send(JSON.stringify({
            op: 'GUILD_FETCH_RESPONSE',
            c: bot.guilds.get(message.id),
            requestedID: message.id,
            shardID: argv.shardid
          }))
          break
        case 'GET_USER_PERMS_GUILD':
          let tempGuild = bot.guilds.get(message.id)
          if (tempGuild) {
            process.send(JSON.stringify({
              op: 'GET_USER_PERMS_GUILD_RESPONSE',
              c: tempGuild.members.get(message.userID).permission.json,
              requestedID: message.id,
              shardID: argv.shardid
            }))
          } else {
            process.send(JSON.stringify({
              op: 'GET_USER_PERMS_GUILD_RESPONSE',
              c: null,
              requestedID: message.id,
              shardID: argv.shardid
            }))
          }
          break
        case 'GET_EDITABLE_GUILDS':
          let editableServers = []
          if (message.c) {
            message.c.forEach((guild) => {
              if (bot.guilds.get(guild.id) && (bot.guilds.get(guild.id).members.get(message.id).permission.json.manageGuild || bot.guilds.get(guild.id).members.get(message.id).permission.json.administrator)) {
                editableServers.push({
                  name: guild.name,
                  id: guild.id,
                  owner: guild.owner ? 'You' : bot.users.get(bot.guilds.get(guild.id).ownerID).username,
                  iconURL: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256` : 'https://s15.postimg.cc/nke6jbnyz/redcircle.png'
                })
              }
            })
            process.send(JSON.stringify({
              op: 'GET_EDITABLE_GUILDS_RESPONSE',
              c: editableServers,
              requestedID: message.id,
              shardID: argv.shardid
            }))
          } else {
            process.send(JSON.stringify({
              op: 'GET_EDITABLE_GUILDS_RESPONSE',
              c: [],
              requestedID: message.id,
              shardID: argv.shardid
            }))
          }
          break
        case 'GET_LASTNAMES':
          getUserDocument(message.id).then((doc) => {
            process.send(JSON.stringify({
              op: 'GET_LASTNAMES_RESPONSE',
              c: doc.names ? doc.names : ['None'],
              requestedID: message.id,
              shardID: argv.shardid
            }))
          })
          break
        case 'GET_ACCESSABLE_CHANNELS':
          let accessableChannels = []
          let guild = bot.guilds.get(message.c)
          if (guild) {
            accessableChannels = guild.channels.filter(c => c.type === 0).filter((c) => {
              if (c.permissionsOf(message.id).json['sendMessages']) {
                return true
              } else {
                return false
              }
            })
          }
          process.send(JSON.stringify({
            op: 'GET_ACCESSABLE_CHANNELS_RESPONSE',
            c: accessableChannels,
            requestedID: message.id,
            shardID: argv.shardid
          }))
          break
        case 'CHANNEL_FETCH':
          process.send(JSON.stringify({
            op: 'CHANNEL_FETCH_RESPONSE',
            c: bot.getChannel(message.id),
            requestedID: message.id,
            shardID: argv.shardid
          }))
          break
        case 'RECACHE_REDIS':
          loadToRedis(message.id)
          process.send(JSON.stringify({
            op: 'RECACHE_REDIS_RESPONSE',
            requestedID: message.id,
            shardID: argv.shardid
          }))
          break
        case 'HEARTBEAT':
          process.send(JSON.stringify({
            op: 'HEARTBEAT_RESPONSE',
            shardID: argv.shardid,
            ready: bot.ready
          }))
          break
      }
    } else {
      process.send(JSON.stringify({
        op: 'SHARD_BOOTING',
        shardID: argv.shardid
      }))
    }
  })

} else {
  log.info('IPC shard manager not detected, running without overhead.')
}

process.on('unhandledRejection', (e) => {
  Raven.captureException(e, {level: 'error'})
})

process.on('uncaughtException', (e) => {
  Raven.captureException(e, {level: 'fatal'})
})

export { bot, Redis }

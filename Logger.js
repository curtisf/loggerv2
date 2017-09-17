import bluebird from 'bluebird'
import Eris from 'eris'
import { log } from './system/log'
import redis from 'redis'
import sleep from 'sleep'
import * as request from 'superagent'
import spawn from 'cross-spawn'

process.title = 'Logger v2.5'

const Config = require('./botconfig.json')
let bot
if (Config.shardMode === true) {
  bot = new Eris(Config.core.token, {
    maxShards: Config.shardCount
  })
} else {
  bot = new Eris(Config.core.token)
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
    log.info(`Hello Discord! I'm ${user.username}#${user.discriminator} (${user.id}), in ${bot.guilds.size} servers with ${bot.users.size} known members.`)
  })
})

bot.on('disconnect', () => {
  init()
})

bot.on('error', (e) => {
  log.error(`Shard encountered an error!`, e)
})

function init () {
  if (restarts === 0) {
    bot.connect()
    log.info('Booting up, no restarts...')
    restarts++
  } else if (restarts <= 10) {
    bot.connect()
    log.info(`Booting up... ${restarts} restarts.`)
    restarts++
  } else {
    log.error('Maximum amount of restarts reached, permanently sleeping.')
    sleep.sleep(99999999) // hopefully we'll be awake by then
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
    middleware('guildMemberRemove', g, guild.id)
  }
})

bot.on('guildMemberUpdate', (guild, member, oldMember) => {
  let g = {}
  g.guild = guild
  g.member = member
  g.oldMember = oldMember
  middleware('guildMemberUpdate', g, guild.id)
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

function postToDbots (count) {
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

let processes = []

if (Config.dev.usedash === true) {
  processes['dashboard'] = {
    process: spawn('node', ['./dashboard.js'], {
      detached: false,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })
    .on('message', message => {
      if (!message.type) {
        log.warn('Invalid request from child process, denying.')
      } else {
        switch (message.type) {
          case 'getUser':
            processes['dashboard'].process.send({
              type: 'getUserReply',
              content: JSON.stringify(bot.users.get(message.id), null, '   '),
              requestedID: message.id
            })
            break
          case 'getChannels':
            processes['dashboard'].process.send({
              type: 'getChannelsReply',
              content: JSON.stringify(bot.guilds.get(message.id).channels.filter(c => c.type === 0), null, '   '),
              requestedID: message.id
            })
            break
          case 'getBotPerms':
            let botPerms
            if (message.channelID) {
              let channel = bot.getChannel(message.channelID)
              if (!channel) {
                processes['dashboard'].process.send({
                  type: 'getBotPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              } else {
                botPerms = channel.permissionsOf(bot.user.id)
              }
            } else {
              let guild = bot.guilds.get(message.guildID)
              if (!guild) {
                processes['dashboard'].process.send({
                  type: 'getBotPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              }
              botPerms = guild.members.get(bot.user.id).permission.json
            }
            processes['dashboard'].process.send({
              type: 'getBotPermsReply',
              content: JSON.stringify(botPerms, null, '  '),
              requestedID: message.guildID || message.channelID
            })
            break
          case 'getUserPerms':
            let user = bot.users.get(message.userID)
            let userPerms
            let isOwner
            if (message.channelID) {
              let channel = bot.getChannel(message.channelID)
              if (!channel) {
                processes['dashboard'].process.send({
                  type: 'getUserPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              } else {
                userPerms = channel.guild.members.get(message.userID).permission.json
                isOwner = channel.guild.ownerID === user.id
              }
            } else {
              let guild = bot.guilds.get(message.guildID)
              if (!guild) {
                processes['dashboard'].process.send({
                  type: 'getUserPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              } else {
                userPerms = guild.members.get(message.userID).permission.json
                isOwner = guild.ownerID === user.id
              }
            }
            if (isOwner) {
              Object.keys(userPerms).forEach((key) => {
                Object.keys(userPerms[key]).forEach((prop) => {
                  userPerms[key][prop] = true
                })
              })
            }
            processes['dashboard'].process.send({
              type: 'getUserPermsReply',
              content: JSON.stringify(userPerms, null, '  '),
              requestedID: message.userID
            })
            break
          case 'getChannelInfo':
            let channel = bot.getChannel(message.id)
            processes['dashboard'].process.send({
              type: 'getChannelInfoReply',
              content: JSON.stringify(channel, null, '  '),
              requestedID: message.id
            })
            break
        }
      }
    })
  }
}

process.on('exit', function () {
  Object.keys(processes).forEach((key) => {
    processes[key].process.kill()
    console.log(`Killed ${key} due to main process dying.`)
  })
})

export { bot, Redis }

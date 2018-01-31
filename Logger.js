import bluebird from 'bluebird'
import Eris from 'eris'
import { log } from './system/log'
import redis from 'redis'
import sleep from 'sleep'
import * as request from 'superagent'
import spawn from 'cross-spawn'
import { getUserDocument, loadToRedis } from './handlers/read'

process.title = 'Logger v2.5'

const Config = require('./botconfig.json')
let bot
if (Config.shardMode === true) {
  bot = new Eris(Config.core.token, {
    getAllUsers: true,
    maxShards: Config.shardCount,
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
    log.info(`Hello Discord! I'm ${user.username}#${user.discriminator} (${user.id}), in ${bot.guilds.size} servers with ${bot.users.size} known members.`)
  })
})

bot.on('disconnect', () => {
  init()
})

bot.on('error', (e) => {
  log.error('Shard encountered an error!', e)
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
    process: spawn('node', [Config.dev.filepath], {
	  cwd: Config.dev.dirpath,
      detached: false,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })
    .on('message', message => {
      message = JSON.parse(message)
      if (!message.op) {
        log.warn('Invalid request from child process, denying.', message)
      } else {
        switch (message.op) {
          case 'GETUSER':
            processes['dashboard'].process.send({
              op: 'GETUSER_RESPONSE',
              c: JSON.stringify(bot.users.get(message.id), null, '   '),
              requestedID: message.id
            })
            break
          case 'GUILD_FETCH':
            processes['dashboard'].process.send({
              op: 'GUILD_FETCH_RESPONSE',
              c: bot.guilds.get(message.id),
              requestedID: message.id
            })
            break
          case 'GET_USER_PERMS_GUILD':
            processes['dashboard'].process.send({
              op: 'GET_USER_PERMS_GUILD_RESPONSE',
              c: bot.guilds.get(message.id).members.get(message.userID).permission.json,
              requestedID: message.id
            })
            break
          case 'GET_EDITABLE_GUILDS':
            let editableServers = []
            if (message.content) {
              message.content.forEach((guild) => {
                if (bot.guilds.get(guild.id) && (bot.guilds.get(guild.id).members.get(message.id).permission.json.manageGuild || bot.guilds.get(guild.id).members.get(message.id).permission.json.administrator)) {
                  editableServers.push({
                    name: guild.name,
                    id: guild.id,
                    owner: guild.owner ? 'You' : bot.users.get(bot.guilds.get(guild.id).ownerID).username,
                    iconURL: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256` : 'https://whatezlife.com/images/unavailable.png'
                  })
                }
              })
              processes['dashboard'].process.send({
                op: 'GET_EDITABLE_GUILDS_RESPONSE',
                c: editableServers,
                requestedID: message.id
              })
            } else {
              processes['dashboard'].process.send({
                op: 'GET_EDITABLE_GUILDS_RESPONSE',
                c: [],
                requestedID: message.id
              })
            }
            break
          case 'GET_LASTNAMES':
            getUserDocument(message.id).then((doc) => {
              processes['dashboard'].process.send({
                op: 'GET_LASTNAMES_RESPONSE',
                c: doc.names ? doc.names : ['None'],
                requestedID: message.id
              })
            })
            break
          case 'GET_ACCESSABLE_CHANNELS':
            let guild = bot.guilds.get(message.content)
            let accessableChannels = guild.channels.filter(c => c.type === 0).filter((c) => {
              if (c.permissionsOf(message.id).json['sendMessages']) {
                return true
              } else {
                return false
              }
            })
            processes['dashboard'].process.send({
              op: 'GET_ACCESSABLE_CHANNELS_RESPONSE',
              c: accessableChannels,
              requestedID: message.id
            })
            break
          case 'CHANNEL_FETCH':
            processes['dashboard'].process.send({
              op: 'CHANNEL_FETCH_RESPONSE',
              c: bot.getChannel(message.id),
              requestedID: message.id
            })
            break
          case 'RECACHE_REDIS':
            loadToRedis(message.id)
            processes['dashboard'].process.send({
              op: 'RECACHE_REDIS_RESPONSE',
              requestedID: message.id
            })
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

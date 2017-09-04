import bluebird from 'bluebird'
import Discordie from 'discordie'
import { log } from './system/log'
import redis from 'redis'
import sleep from 'sleep'
import * as request from 'superagent'
import spawn from 'cross-spawn'

process.title = 'Logger v2'

const Config = require('./botconfig.json')
const bot = new Discordie({ autoReconnect: true })
bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const Redis = redis.createClient()
const middleware = require('./system/middleware').handle

let restarts = 0

init()

bot.Dispatcher.on('GATEWAY_READY', () => {
  log.info('Connected to the Discord Gateway.')
  if (Config.misc.defaultGame) {
    bot.User.setStatus(null, {
      type: 0,
      name: `${Config.misc.defaultGame}`
    })
  }
  bot.Users.fetchMembers().then(() => {
    log.info(`Hello Discord! I'm ${bot.User.username}#${bot.User.discriminator} (${bot.User.id}), in ${bot.Guilds.length} servers with ${bot.Users.length} known members.`)
    postToDbots(bot.Guilds.length)
  })
})

bot.Dispatcher.on('DISCONNECTED', () => {
  init()
})

bot.Dispatcher.onAny((type, args) => {
  middleware(type, args)
})

function init () {
  if (restarts === 0) {
    bot.connect({ token: Config.core.token })
    log.info('Booting up, no restarts...')
    restarts++
  } else if (restarts <= 10) {
    bot.connect({ token: Config.core.token })
    log.info(`Booting up... ${restarts} restarts.`)
    restarts++
  } else {
    log.error('Maximum amount of restarts reached, permanently sleeping.')
    sleep.sleep(1000000000000000000000000000000000000) // hopefully we'll be awake by then
  }
}

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
              content: JSON.stringify(bot.Users.get(message.id), null, '   '),
              requestedID: message.id
            })
            break
          case 'getChannels':
            processes['dashboard'].process.send({
              type: 'getChannelsReply',
              content: JSON.stringify(bot.Guilds.get(message.id).textChannels, null, '   '),
              requestedID: message.id
            })
            break
          case 'getBotPerms':
            let botPerms
            if (message.channelID) {
              let channel = bot.Channels.get(message.channelID)
              if (!channel) {
                processes['dashboard'].process.send({
                  type: 'getBotPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              } else {
                botPerms = bot.User.permissionsFor(channel)
              }
            } else {
              let guild = bot.Guilds.get(message.guildID)
              if (!guild) {
                processes['dashboard'].process.send({
                  type: 'getBotPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              }
              botPerms = bot.User.permissionsFor(guild)
            }
            processes['dashboard'].process.send({
              type: 'getBotPermsReply',
              content: JSON.stringify(botPerms, null, '  '),
              requestedID: message.guildID || message.channelID
            })
            break
          case 'getUserPerms':
            let user = bot.Users.get(message.userID)
            let userPerms
            let isOwner
            if (message.channelID) {
              let channel = bot.Channels.get(message.channelID)
              if (!channel) {
                processes['dashboard'].process.send({
                  type: 'getUserPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              } else {
                userPerms = user.permissionsFor(channel)
                isOwner = bot.Guilds.get(channel.guild_id).isOwner(user)
              }
            } else {
              let guild = bot.Guilds.get(message.guildID)
              if (!guild) {
                processes['dashboard'].process.send({
                  type: 'getUserPermsReply',
                  content: null,
                  requestedID: message.userID
                })
                return
              } else {
                userPerms = user.permissionsFor(guild)
                isOwner = guild.isOwner(user)
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
            let channel = bot.Channels.get(message.id)
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

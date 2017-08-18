import bluebird from 'bluebird'
import Discordie from 'discordie'
import { log } from './system/log'
import redis from 'redis'
import sleep from 'sleep'

process.title = 'Logger v2'

const Config = require('./config.json')
const bot = new Discordie({ autoReconnect: true })
const dir = require('require-all')(__dirname + '/events')
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
  })
})

bot.Dispatcher.on('DISCONNECTED', () => {
  init()
})

bot.Dispatcher.onAny(middleware)

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

export { bot, Redis }

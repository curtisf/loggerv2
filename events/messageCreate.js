import { Redis } from '../Logger'
import { log } from '../system/log'
import { influx } from '../system/middleware'
const os = require('os')
let superagent = require('superagent')
const Config = require('../botconfig.json')
let Commands = require('../system/commands').Commands
let commandObj = {}
Object.keys(Commands).forEach((command) => commandObj[command] = 0)
let base64Obj = {}

setInterval(() => {
  base64Obj = {}
}, 14400000)

module.exports = {
  toggleable: false,
  run: function (bot, msg) {
    if (msg.attachments.length !== 0) {
      superagent.get(msg.attachments[0].url).then((res) => {
        base64Obj[msg.id] = res.body.toString('base64')
        console.log(process.memoryUsage().heapUsed / 1024 / 1024)
        msg.attachments[0].base64 = res.body.toString('base64')
      })
    }
    if (msg.author.bot || msg.author.id === bot.user.id) {
    // Ignore
    } else if (msg.channel.guild) {
        // Command detection
      let prefix = Config.core.prefix
      if (msg.content.startsWith(prefix)) {
        let cmd = msg.content.substring(prefix.length).split(' ')[0].toLowerCase()
        let splitSuffix = msg.content.substr(Config.core.prefix.length).split(' ')
        let suffix = splitSuffix.slice(1, splitSuffix.length).join(' ')

        if (Object.keys(Commands).includes(cmd)) {
          try {
            let bp = msg.channel.guild.members.get(bot.user.id).permission.json
            if (!bp.viewAuditLogs || !bp.sendMessages) {
                  // Ignore
            } else {
              let gd = {}
              for (let key in msg.channel.guild) {
                gd[key] = msg.channel.guild[key]
              }
              gd.channels = []
              gd.members = []
              gd.roles = []
              gd.emojis = []
              gd.defaultChannel = []
              gd.shard = []
              gd.toString = 'no.'
              log.info(`Command "${cmd}${suffix ? ` ${suffix}` : ''}" from user ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})\n`, {
                guild: gd,
                botID: bot.user.id,
                cmd: cmd,
                shard: msg.channel.guild.shard.id
              })
              commandObj[cmd]++
              Commands[cmd].func(msg, suffix, bot)
            }
          } catch (err) {
            log.error(`An error occurred while executing command "${cmd}${suffix ? ` ${suffix}` : ''}", error returned:`)
            log.error(err) // to get the full error (trace)
          }
        }
      }
    }
  }
}

if (Config.influx.use) {
  setInterval(() => {
    let allToSend = []
    Object.keys(commandObj).forEach((event) => {
      allToSend.push({
        measurement: event,
        tags: { host: os.hostname() },
        fields: { count: commandObj[event] }
      })
      commandObj[event] = 0
    })
    influx.writePoints(allToSend)
  }, 60000)
}

import { log } from '../system/log'
const Config = require('../botconfig.json')
let Commands = require('../system/commands').Commands

module.exports = {
  toggleable: false,
  run: function (bot, msg) {
    if (msg.author.bot || msg.author.id === bot.user.id) {
    // Ignore
    } else if (!msg.channel.guild) {
      if (msg.content.startsWith(Config.core.prefix)) {
        if (msg.content.substring(Config.core.prefix.length).split(' ')[0].toLowerCase() === 'join') {
          Commands.join.func(msg)
        } else {
          msg.channel.sendMessage(`I can't be used in DMs! Please invite me to a server using ${Config.core.prefix}join and try again.`)
        }
      }
    } else {
        // Command detection
      let prefix = Config.core.prefix
      if (msg.content.startsWith(prefix)) {
        let cmd = msg.content.substring(prefix.length).split(' ')[0].toLowerCase()
        let splitSuffix = msg.content.substr(Config.core.prefix.length).split(' ')
        let suffix = splitSuffix.slice(1, splitSuffix.length).join(' ')

        if (Object.keys(Commands).includes(cmd)) {
          try {
            let bp = msg.channel.guild.members.get(msg.author.id).permission.json
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
              log.info(`Command "${cmd}${suffix ? ` ${suffix}` : ''}" from user ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})\n`, {
                guild: gd,
                botID: bot.user.id,
                cmd: cmd,
                shard: msg.channel.guild.shard.id
              })
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

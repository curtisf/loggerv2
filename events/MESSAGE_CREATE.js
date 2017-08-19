import { log } from '../system/log'
const Config = require('../config.json')
let Commands = require('../system/commands').Commands

module.exports = {
  toggleable: false,
  run: function (bot, raw) {
    let msg = raw.message
    if (msg.author.bot || msg.author.id === bot.User.id) {
    // Ignore
    } else if (msg.channel.isPrivate) {
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
            let bp = bot.User.permissionsFor(msg.channel)
            if (!bp.Text.READ_MESSAGES || !bp.Text.SEND_MESSAGES) {
                  // Ignore
            } else {
              let gd = {}
              for (let key in msg.guild) {
                gd[key] = msg.guild[key]
              }
              gd.roles = []
              gd.emojis = []
              log.info(`Command "${cmd}${suffix ? ` ${suffix}` : ''}" from user ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})\n`, {
                guild: gd,
                botID: bot.User.id,
                cmd: cmd
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

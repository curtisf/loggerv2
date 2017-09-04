import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'emojis_updated',
  type: 'GUILD_EMOJIS_UPDATE',
  toggleable: true,
  run: function (bot, raw) {
    let changes = raw.getChanges()
    let before = changes.before
    let after = changes.after
    let guild = raw.guild
    let obj = {
      guildID: guild.id,
      type: 'Emoji ',
      changed: ``,
      color: 8351671
    }
    if (before.length > after.length) {
      obj.type += `Deleted` // 62
      getLastByType(guild.id, 62, 1).then((log) => {
        if (log[0]) {
        log = log[0]
        let user = bot.Users.get(log.user_id)
        obj.changed += `► Name: **${log.changes[0].old_value}**\n► ID: **${log.target_id}**`
        obj.from = user
        sendToLog(bot, obj)
        }
      })
    } else if (after.length > before.length) {
      obj.type += `Created` // 60
      getLastByType(guild.id, 60, 1).then((log) => {
        if (log[0]) {
        log = log[0]
        let user = bot.Users.get(log.user_id)
        obj.changed += `► Emoji: <:${log.changes[0].new_value}:${log.target_id}>\n► Name: **${log.changes[0].new_value}**\n► ID: **${log.target_id}**`
        obj.from = user
        sendToLog(bot, obj)
        }
      })
    } else {
      obj.type += `Updated` // 61
      getLastByType(guild.id, 61, 1).then((log) => {
        if (log[0]) {
          log = log[0]
          let user = bot.Users.get(log.user_id)
          obj.changed += `► Emoji: <:${log.changes[0].new_value}:${log.target_id}>\n► Now: **${log.changes[0].new_value}**\n► Previously: **${log.changes[0].old_value}**\n► ID: **${log.target_id}**`
          obj.from = user
          sendToLog(bot, obj)
        }
      })
    }
  }
}

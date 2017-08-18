import { log } from '../system/log'
import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'user_unbanned',
  type: 'GUILD_BAN_REMOVE',
  toggleable: true,
  run: function (bot, raw) {
    let unbanned = raw.user
    let guild = raw.guild
    getLastByType(guild.id, 23, 1).then((entry) => {
      entry = entry[0]
      let user = bot.Users.get(entry.user_id)
      sendToLog(bot, {
        guildID: guild.id,
        type: 'Member Unbanned',
        changed: `► Name: **${unbanned.username}#${unbanned.discriminator}**\n► ID: **${unbanned.id}**`,
        color: 8351671,
        against: unbanned,
        from: user
      })
    })
  }
}

import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'user_banned',
  type: 'GUILD_BAN_ADD',
  toggleable: true,
  run: function (bot, raw) {
    let banned = raw.user
    let guild = raw.guild
    getLastByType(guild.id, 22, 1).then((entry) => {
      entry = entry[0]
      let user = bot.Users.get(entry.user_id)
      sendToLog(bot, {
        guildID: guild.id,
        type: 'Member Banned',
        changed: `► Name: **${banned.username}#${banned.discriminator}**\n► ID: **${banned.id}**${entry.reason ? `\n► Reason: \`${entry.reason}\`` : ''}`,
        color: 8351671,
        against: banned,
        from: user
      })
    })
  }
}

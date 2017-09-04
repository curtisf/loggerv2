import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'user_banned',
  type: 'GUILD_BAN_ADD',
  toggleable: true,
  run: function (bot, raw) {
    let banned = raw.user
    let guild = raw.guild
    let obj = {
      guildID: guild.id,
      type: 'Member Banned',
      changed: `► Name: **${banned.username}#${banned.discriminator}**\n► ID: **${banned.id}**`,
      color: 8351671,
      against: banned,
    }
    getLastByType(guild.id, 22, 1).then((entry) => {
      if (entry[0]) {
      entry = entry[0]
      let user = bot.Users.get(entry.user_id)
      obj = {
        guildID: guild.id,
        type: 'Member Banned',
        changed: `► Name: **${banned.username}#${banned.discriminator}**\n► ID: **${banned.id}**${entry.reason ? `\n► Reason: \`${entry.reason}\`` : ''}`,
        color: 8351671,
        against: banned,
        from: user
      }
      sendToLog(bot, obj)
    }
    }).catch(() => {
      obj.footer = {
        text: 'I cannot view audit logs!',
        icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
      }
      sendToLog(bot, obj)
    })
  }
}

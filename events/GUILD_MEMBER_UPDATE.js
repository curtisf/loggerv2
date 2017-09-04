import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'member_update',
  type: 'GUILD_MEMBER_UPDATE',
  toggleable: true,
  run: function (bot, raw) {
    let changes = raw.getChanges()
    let guild = raw.guild
    let member = raw.member
    let obj = {
      guildID: guild.id,
      type: `Unknown Role Change`,
      changed: `► Name: **${member.username}#${member.discriminator}**`,
      color: 8351671,
      against: member
    }
    if (raw.rolesAdded.length !== 0 || raw.rolesRemoved.length !== 0) {
      getLastByType(guild.id, 25, 1).then((log) => {
        if (log[0]) {
        if (log[0].changes[0].new_value[0].name !== member.username && member.id === log[0].target_id) {
          log = log[0]
          let user = bot.Users.get(log.user_id)
          let key = log.changes[0].key
          if (key === '$add') {
            key = 'Added'
          } else {
            key = 'Removed'
          }
          obj = {
            guildID: guild.id,
            type: `${key} Role`,
            changed: `► Name: **${member.username}#${member.discriminator}**\n► Role ${key}: **${log.changes[0].new_value[0].name}**\n► Role ID: **${log.changes[0].new_value[0].id}**`,
            color: 8351671,
            against: member
          }
          obj.footer = {
            text: `${key} by ${user.username}#${user.discriminator}`,
            icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'}`
          }
          sendToLog(bot, obj)
        }
      }
      }).catch(() => {
        obj.footer = {
          text: 'I cannot view audit logs!',
          icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
        }
        sendToLog(bot, obj)
      })
    } else if (changes.before.nick !== changes.after.nick) {
      sendToLog(bot, {
        guildID: guild.id,
        type: 'Nickname Changed',
        changed: `► Now: **${changes.after.nick ? changes.after.nick : member.username}#${member.discriminator}**\n► Was: **${changes.before.nick ? changes.before.nick : member.username}#${member.discriminator}**\n► ID: **${member.id}**`,
        color: 8351671,
        against: member
      })
    }
  }
}

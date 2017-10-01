import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'guildBanRemove',
  type: 'guildBanRemove',
  toggleable: true,
  run: function (bot, raw) {
    let unbanned = raw.user
    let guild = raw.guild
    let obj = {
      guildID: guild.id,
      type: 'Member Unbanned',
      changed: `► Name: **${unbanned.username}#${unbanned.discriminator}**\n► ID: **${unbanned.id}**`,
      color: 8351671,
      against: unbanned
    }
    setTimeout(() => {
      guild.getAuditLogs(1, null, 23).then((entry) => {
        let user = log.entries[0].user
        obj = {
          guildID: guild.id,
          type: 'Member Unbanned',
          changed: `► Name: \`${unbanned.username}#${unbanned.discriminator}\`\n► ID: **${unbanned.id}**${entry.entries[0].reason ? `\n► Reason: \`${entry.entries[0].reason}\`` : ''}`,
          color: 8351671,
          against: unbanned,
          from: user
        }
        sendToLog(bot, obj)
      }).catch(() => {
        obj.footer = {
          text: 'I cannot view audit logs!',
          icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
        }
        sendToLog(bot, obj)
      })
    }, 1000) // because audit logs aren't so instant.
  }
}

import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'guildBanAdd',
  type: 'guildBanAdd',
  toggleable: true,
  run: function (bot, raw) {
    let banned = raw.user
    let guild = raw.guild
    let obj = {
      guildID: guild.id,
      type: 'Member Banned',
      changed: `► Name: **${banned.username}#${banned.discriminator}**\n► ID: **${banned.id}**`,
      color: 8351671,
      against: banned
    }
    guild.getAuditLogs(1, null, 22).then((entry) => {
      let user = log.entries[0].user
      obj = {
        guildID: guild.id,
        type: 'Member Banned',
        changed: `► Name: \`${banned.username}#${banned.discriminator}\`\n► ID: **${banned.id}**${entry.entries[0].reason ? `\n► Reason: \`${entry.entries[0].reason}\`` : ''}`,
        color: 8351671,
        against: banned,
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
  }
}

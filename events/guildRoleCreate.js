import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'guildRoleCreate',
  type: 'guildRoleCreate',
  toggleable: true,
  run: function (bot, raw) {
    let role = raw.role
    raw.guild.getAuditLogs(1, null, 30).then((log) => {
      let obj = {
        guildID: raw.guild.id,
        type: 'Role Created',
        changed: `${role.name !== 'new role' ? `► Name: **${role.name}**\n` : ``}► ID: **${role.id}**`,
        color: 8351671
      }
      if (log.users.length === 0) {
        obj.footer = {
          text: 'Automatically Created',
          icon_url: 'http://www.multiwiniahub.com/images/discordIcon2.png'
        }
      } else {
        obj.from = log.users[0]
      }
      sendToLog(bot, obj)
    }).catch(() => {})
  }
}

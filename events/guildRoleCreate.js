import { sendToLog } from '../system/modlog'
import { updateOverview } from '../handlers/read'

module.exports = {
  name: 'guildRoleCreate',
  type: 'guildRoleCreate',
  toggleable: true,
  run: function (bot, raw) {
    updateOverview(raw.guild.id)
    let role = raw.role
    raw.guild.getAuditLogs(1, null, 30).then((log) => {
      let obj = {
        guildID: raw.guild.id,
        type: 'Role Created',
        changed: `${role.name !== 'new role' ? `► Name: **${role.name}**\n` : ``}► ID: **${role.id}**`,
        color: 8351671
      }
      if (log.users.length === 0) {
        obj.simple = `Role automatically created from integration.`
        obj.footer = {
          text: 'Automatically Created',
          icon_url: 'http://www.multiwiniahub.com/images/discordIcon2.png'
        }
      } else {
        obj.simple = `**${log.users[0].username}#${log.users[0].discriminator}** created a new role.`
        obj.from = log.users[0]
      }
      sendToLog(this.name, bot, obj)
    }).catch(() => {})
  }
}

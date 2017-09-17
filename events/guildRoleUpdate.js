import { sendToLog } from '../system/modlog'
import { toTitleCase } from '../system/utils'

module.exports = {
  name: 'guildRoleUpdate',
  type: 'guildRoleUpdate',
  toggleable: true,
  run: function (bot, raw) {
    let guild = raw.guild
    let newRole = raw.newRole
    let oldRole = raw.oldRole
    let oldKeys = Object.keys(oldRole)
    raw.guild.getAuditLogs(1, null, 31).then((log) => {
      let fields = [{name: 'Info', value: `► Name: **${newRole.name}**\n► ID: **${newRole.id}**`}]
      for (let i = 0; i < oldKeys.length; i++) {
        if (newRole[oldKeys[i]].toString() !== oldRole[oldKeys[i]].toString() && oldKeys[i] !== 'position') {
          fields.push({
            name: `${toTitleCase(oldKeys[i])}`,
            value: `Now: **${newRole[oldKeys[i]]}**\nWas: **${oldRole[oldKeys[i]]}**`
          })
        }
      }
      sendToLog(bot, {
        guildID: guild.id,
        type: 'Role Updated',
        changed: `► Name: **${newRole.name}**\n► ID: **${newRole.id}**`,
        color: newRole.color,
        from: log.users[0]
      }, null, null, fields)
    }).catch(() => {})
  }
}

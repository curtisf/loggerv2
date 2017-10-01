import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'guildRoleDelete',
  type: 'guildRoleDelete',
  toggleable: true,
  run: function (bot, raw) {
    let guild = raw.guild
    let role = raw.role
    let keys = Object.keys(role.permissions.json)
    let perms = []
    if (keys.length !== 0) {
      keys.forEach((k) => {
        if (role.permissions.json[k]) {
          perms.push(`${k}`)
        }
      })
    } else {
      perms = ['None']
    }
    let obj = {
      guildID: guild.id,
      type: 'Role Deleted',
      changed: `► Name: **${role.name}**\n► ID: **${role.id}**\n► Position: **${role.position}**\n► Hoisted: **${role.hoist ? 'Yes' : 'No'}**\n► Mentionable: **${role.mention ? 'Yes' : 'No'}**\n► Permissions: \`\`\`\n${perms.join(', ')}\`\`\``,
      color: role.color
    }
    guild.getAuditLogs(1, null, 32).then((entry) => {
      let user = entry.entries[0].user
      obj.from = user
      sendToLog(bot, obj)
    }).catch(() => {})
  }
}

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
      let user = entry.users[0]
      obj.from = user
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

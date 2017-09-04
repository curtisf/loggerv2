import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'role_deleted',
  type: 'GUILD_ROLE_DELETE',
  toggleable: true,
  run: function (bot, raw) {
    let guild = raw.guild
    getLastByType(guild.id, 32, 1).then((entry) => {
      if (entrt[0]) {
      entry = entry[0]
      let user = bot.Users.get(entry.user_id)
      let name = entry.changes.filter(c => c.key === 'name')[0].old_value
      sendToLog(bot, {
        guildID: guild.id,
        type: 'Role Deleted',
        changed: `► Name: **${name}**\n► ID: **${raw.roleId}**`,
        color: 8351671,
        from: user
      })
    }
    })
  }
}

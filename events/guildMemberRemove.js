import { sendToLog } from '../system/modlog'
import { updateOverview } from '../handlers/read'

module.exports = {
  name: 'guildMemberRemove',
  type: 'guildMemberRemove',
  toggleable: true,
  run: function (bot, raw) {
    updateOverview(raw.guild.id)
    let guild = raw.guild
    let member = raw.member
    if (member.id !== bot.user.id) {
      let obj = {
        guildID: guild.id,
        type: 'Member Left Or Was Kicked',
        changed: '',
        color: 16711680,
        against: member,
        simple: `**${member.username}#${member.discriminator}** left the server.`
      }
      let roles = []
      member.roles.forEach(r => {
        if (guild.roles.get(r)) {
          roles.push(guild.roles.get(r).name)
        }
      })
      obj.changed = `► Name: **[\`${member.username}#${member.discriminator}\`](https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.jpg)** (${member.id})\n► Joined At: **${member.joinedAt ? new Date(member.joinedAt).toString().substr(0, 21) : 'Unknown'}**${roles.length !== 0 ? `\n► Roles:\n\`\`\`${roles.join(', ')}\`\`\`` : ''}`
      sendToLog(this.name, bot, obj)
    }
  }
}

import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'member_leave',
  type: 'GUILD_MEMBER_REMOVE',
  toggleable: true,
  run: function (bot, raw) {
    let guild = raw.guild
    let member = raw.getCachedData()
    let data = raw.data.user
    let obj = {
      guildID: guild.id,
      type: 'Member Left Or Was Kicked',
      changed: '',
      color: 8351671,
      against: {
        username: data.username,
        discriminator: data.discriminator
      }
    }
    if (member !== null) {
      let roles = member.roles.map(r => {
        return guild.roles.find(role => role.id === r).name
      })
      obj.changed = `► Name: **[\`${data.username}#${data.discriminator}\`](https://cdn.discordapp.com/avatars/${member.id}/${data.avatar}.jpg)** (${member.id})\n► Joined At: **${member.joined_at.substr(0, 10)}**${member.roles.length !== 0 ? `\n► Roles:\n\`\`\`${roles.join(', ')}\`\`\`` : ''}`
      obj.against = data
    } else {
      if (data.avatar) {
        obj.against.thumbnail = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.jpg`
        obj.changed = `► Name: **[\`${data.username}#${data.discriminator}\`](https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.jpg)** (${data.id})`
      } else {
        obj.changed = `► Name: **\`${data.username}#${data.discriminator}\`** (${data.id})`
      }
    }
    sendToLog(bot, obj)
  }
}

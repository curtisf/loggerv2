import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'voiceChannelLeave',
  type: 'voiceChannelLeave',
  toggleable: true,
  run: function (bot, raw) {
    let channel = raw.channel
    let member = raw.member
    sendToLog(bot, {
      guildID: channel.guild.id,
      type: 'User Left Voice Channel',
      changed: `► User: **${member.username}#${member.discriminator}**\n► User ID: **${member.id}**\n► Channel: **${channel.name}**\n► Channel ID: **${channel.id}**`,
      color: 8351671,
      against: member
    })
  }
}

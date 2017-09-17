import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'voiceChannelSwitch',
  type: 'voiceChannelSwitch',
  toggleable: true,
  run: function (bot, raw) {
    let oldChannel = raw.oldChannel
    let newChannel = raw.newChannel
    let member = raw.member
    sendToLog(bot, {
      guildID: newChannel.guild.id,
      type: 'User Switched Voice Channels',
      changed: `► User: **${member.username}#${member.discriminator}**\n► User ID: **${member.id}**\n► Now Connected To: **${newChannel.name}**\n► Previously Connected To: **${oldChannel.name}**`,
      color: 8351671,
      against: member
    })
  }
}

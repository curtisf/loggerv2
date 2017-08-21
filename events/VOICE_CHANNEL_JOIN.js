import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'voice_channel_join',
  type: 'VOICE_CHANNEL_JOIN',
  toggleable: true,
  run: function (bot, raw) {
    let channel = raw.channel
    let user = raw.user
    sendToLog(bot, {
      guildID: raw.guildId,
      type: 'User Joined Voice Channel',
      changed: `► User: **${user.username}#${user.discriminator}**\n► User ID: **${user.id}**\n► Channel: **${channel.name}**\n► Channel ID: **${channel.id}**`,
      color: 8351671,
      against: user
    })
  }
}

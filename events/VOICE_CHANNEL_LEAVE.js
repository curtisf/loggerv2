import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'voice_channel_leave',
  type: 'VOICE_CHANNEL_LEAVE',
  toggleable: true,
  run: function (bot, raw) {
    let channel = raw.channel
    let user = raw.user
    let obj = {
      guildID: raw.guildId,
      type: 'User Joined Left Channel',
      changed: `► User: **${user.username}#${user.discriminator}**\n► User ID: **${user.id}**`,
      color: 8351671,
      against: user
    }
    if (channel) {
      if (raw.newChannelId) {
        obj.type = 'User Changed Voice Channel'
        obj.changed = `► User: **${user.username}#${user.discriminator}**\n► User ID: **${user.id}**\n► Now Connected To **${bot.Channels.get(raw.newChannelId).name}**\n► Previously Connected To **${channel.name}**`
        sendToLog(bot, obj)
      } else {
        obj.changed += `\n► Channel: **${channel.name}**\n► Channel ID: **${channel.id}**`
        sendToLog(bot, obj)
      }
    }
  }
}

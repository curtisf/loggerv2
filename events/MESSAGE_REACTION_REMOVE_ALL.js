import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'all_reactions_removed',
  type: 'MESSAGE_REACTION_REMOVE_ALL',
  toggleable: true,
  run: function (bot, raw) {
    let channel = raw.channel
    let message = raw.message
    let data = raw.data
    let cachedData = raw.getCachedData()
    if (Object.keys(cachedData).length !== 0) {
      sendToLog(bot, {
        guildID: bot.Channels.get(data.channel_id).guild.id,
        type: 'Message Reactions Removed',
        changed: `${channel ? `► Channel: ${channel.name}\n` : ''}► Content: ${message ? `\`${message.content}\`` : '`Not Cached`'}\n► ID: **${data.message_id}**\n► Reactions:\n${cachedData.map(e => e.emoji.id ? `${e.emoji.name} - ${e.count}` : `${e.emoji.name} - ${e.count}`).join('\n')}`,
        color: 8351671
      })
    } else {
      sendToLog(bot, {
        guildID: bot.Channels.get(data.channel_id).guild.id,
        type: 'Message Reactions Removed',
        changed: `► Channel: **${bot.Channels.get(data.channel_id).name}**\nMessage ID: **${data.message_id}**`,
        color: 8351671
      })
    }
  }
}

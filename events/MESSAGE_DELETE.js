import { badMessageCheck } from '../system/utils'
import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'message_delete',
  type: 'MESSAGE_DELETE',
  toggleable: true,
  run: function (bot, raw) {
    const msg = raw.message
    if (msg.author.id !== bot.User.id && !badMessageCheck(msg.content)) {
      let obj = {
        guildID: msg.guild.id,
        channelID: msg.channel.id,
        type: 'Message Deleted',
        changed: `► Content: \`${msg.content ? msg.content : 'None.'}\`\n► Channel: **${msg.channel.name}**\n► Message ID: ${msg.id}`,
        color: 8351671,
        against: {
          id: `${msg.author.id}`,
          username: `${msg.author.username}`,
          discriminator: `${msg.author.discriminator}`,
          avatar: `${msg.author.avatar}`
        }
      }
      if (msg.author.avatarURL) {
        obj.against.thumbnail = msg.author.avatarURL
      }
      if (msg.attachments.length !== 0) {
        obj.changed += `► Attachment: [${msg.attachments[0].filename}](${msg.attachments[0].url})`
      }
      if (msg.embeds.length !== 0) {
        obj.changed += `\n► Embed: ⇓`
        sendToLog(bot, obj)
        sendToLog(bot, msg.embeds[0], msg.guild.id, msg.channel.id)
      } else {
        sendToLog(bot, obj)
      }
    }
  }
}

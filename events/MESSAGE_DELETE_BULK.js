import * as request from 'superagent'
import { getLogChannel } from '../handlers/read'
import { sendToLog } from '../system/modlog'
import { log } from '../system/log'

module.exports = {
  name: 'message_bulk_delete',
  type: 'MESSAGE_DELETE_BULK',
  toggleable: true,
  run: function (bot, raw) {
    let messageArray = raw.messages
    if (messageArray.length > 1) {
      let channel = bot.Channels.get(messageArray[0].channel_id)
      let guild = channel.guild
      let obj = {
        guildID: guild.id,
        channelID: channel.id,
        type: 'Multiple Messages Deleted',
        changed: `► From Channel **${channel.name}**.`,
        color: 8351671,
        against: {
          id: `${messageArray[0].author.id}`,
          username: `${messageArray[0].author.username}`,
          discriminator: `${messageArray[0].author.discriminator}`,
          avatar: `${messageArray[0].author.avatar}`
        }
      }
      messageArray = messageArray.reverse().map(m => `${m.author.username}#${m.author.discriminator} (${m.author.id}) | ${new Date(m.timestamp)}: ${m.content ? m.content : 'No Content'}${m.attachments.length !== 0 ? ` =====> Attachment: ${m.attachments[0].filename}:${m.attachments[0].url}` : ''}`)
      let messagesString = messageArray.join('\r\n')
      request
      .post(`https://paste.lemonmc.com/api/json/create`)
      .send({
        data: messagesString,
        language: 'text',
        private: true,
        title: `Messages Deleted from ${channel.name.substr(0, 8)}`,
        expire: '21600'
      })
      .end((err, res) => {
        if (!err && res.statusCode === 200 && res.body.result.id) { // weird error reporting system.
          obj.changed += `\n► [Paste URL](https://paste.lemonmc.com/${res.body.result.id}/${res.body.result.hash})\n► Message IDs: \`\`\`xl\n${raw.messageIds}\`\`\``
          sendToLog(bot, obj)
        } else {
          log.error(err)
          obj.changed += `\n► Message IDs: \`\`\`xl\n${raw.messageIds}\`\`\``
          sendToLog(bot, obj)
        }
      })
    }
  }
}

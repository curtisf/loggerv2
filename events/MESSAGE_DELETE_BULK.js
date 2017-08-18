import fs from 'fs'
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
      sendToLog(bot, {
        guildID: guild.id,
        channelID: channel.id,
        type: 'Multiple Messages Deleted',
        changed: `► From Channel **${channel.name}**.\n► Message IDs: \`\`\`xl\n${raw.messageIds}\`\`\``,
        color: 8351671,
        against: {
          id: `${messageArray[0].author.id}`,
          username: `${messageArray[0].author.username}`,
          discriminator: `${messageArray[0].author.discriminator}`,
          avatar: `${messageArray[0].author.avatar}`
        }
      })
      messageArray = messageArray.reverse().map(m => `${m.author.username}#${m.author.discriminator} (${m.author.id}) | ${new Date(m.timestamp)}: ${m.content ? m.content : 'No Content'}${m.attachments.length !== 0 ? ` =====> Attachment: ${m.attachments[0].filename}:${m.attachments[0].url}` : ''}`)
      let osType = `${__dirname.substr(0, __dirname.length - 6)}uploads/`
      fs.writeFile(`${osType}bulk_delete_messages.txt`, messageArray.join('\r\n'), (err) => { // Attempt to fix newlines not being rendered
        if (err) {
          log.error(err)
        } else {
          getLogChannel(guild.id).then((lc) => { // :NotLikeThis:
            if (lc) {
              fs.stat('uploads/bulk_delete_messages.txt', (err) => {
                if (err) {
                  log.error(err)
                } else {
                  lc.uploadFile('uploads/bulk_delete_messages.txt', 'uploads/bulk_delete_messages.txt').then(() => {
                    fs.unlink('uploads/bulk_delete_messages.txt', (err) => {
                      if (err) {
                        log.error(err)
                      }
                    })
                  })
                }
              })
            }
          })
        }
      })
    }
  }
}

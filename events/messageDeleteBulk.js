import * as request from 'superagent'
import { sendToLog } from '../system/modlog'
import { log } from '../system/log'

module.exports = {
  name: 'messageDeleteBulk',
  type: 'messageDeleteBulk',
  toggleable: true,
  run: function (bot, messages) {
    let messageArray = messages
    if (messageArray.length > 1) {
      let channel = bot.guilds.get(messageArray[0].channel.guild.id).channels.get(messageArray[0].channel.id)
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
        },
        simple: `A message purge just happened in: **${channel.name}**.`
      }
      messageArray = messageArray.reverse().map(m => m.author ? `${m.author.username}#${m.author.discriminator} (${m.author.id}) | ${m.id} | ${new Date(m.timestamp)}: ${m.content ? m.content : 'No Message Content'}${m.embeds.length !== 0 ? ' ======> Contains Embed' : ''}${m.attachments.length !== 0 ? ` =====> Attachment: ${m.attachments[0].filename}:${m.attachments[0].url}` : ''}` : `Message ID: ${m.id} | Channel Name: ${m.channel.name} | Channel ID: ${m.channel.id} | Non-Cached Message`)
      let messagesString = messageArray.join('\r\n')
      request
      .post(`https://paste.lemonmc.com/api/json/create`)
      .send({
        data: messagesString,
        language: 'text',
        private: true,
        title: `${channel.name.substr(0, 29)}`,
        expire: '2592000'
      })
      .end((err, res) => {
        if (!err && res.statusCode === 200 && res.body.result.id) { // weird error reporting system.
          obj.changed += `\n► [Click me for contents](https://paste.lemonmc.com/${res.body.result.id}/${res.body.result.hash})`
          sendToLog(this.name, bot, obj)
        } else {
          log.error(err)
          obj.changed += `\n► Error while uploading paste content.`
          sendToLog(this.name, bot, obj)
        }
      })
    }
  }
}

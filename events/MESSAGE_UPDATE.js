import { badMessageCheck } from '../system/utils'
import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'message_edit',
  type: 'MESSAGE_UPDATE',
  toggleable: true,
  run: function (bot, raw) {
    let newMessage = raw.message
    let oldMessage = raw.message.edits[raw.message.edits.length - 1].content
    if (newMessage && oldMessage && newMessage.edits.length < 3) {
      if (!newMessage.author.bot && newMessage.author.id !== bot.User.id && !newMessage.channel.isPrivate && !badMessageCheck(newMessage.content) && oldMessage !== newMessage.content) { // added content check due to phantom message_update events
        let obj = {
          guildID: newMessage.guild.id,
          channelID: newMessage.channel.id,
          type: 'Message Updated',
          changed: `► Previously: \`${oldMessage.replace(/\"/g, '"').replace(/`/g, '')}\`\n► Now: \`${newMessage.content.replace(/\"/g, '"').replace(/`/g, '')}\`\n► From **${newMessage.channel.name}**.\n► Message ID: ${newMessage.id}`, // eslint-disable-line
          color: 8351671,
          against: {
            id: `${newMessage.author.id}`,
            username: `${newMessage.author.username}`,
            discriminator: `${newMessage.author.discriminator}`,
            avatar: `${newMessage.author.avatar}`
          }
        }
        if (newMessage.author.avatarURL) {
          obj.against.thumbnail = `https://cdn.discordapp.com/avatars/${newMessage.author.id}/${newMessage.author.avatar}.jpg`
        }
        sendToLog(bot, obj)
      }
    }
  }
}

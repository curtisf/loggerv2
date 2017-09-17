import { badMessageCheck } from '../system/utils'
import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'messageDelete',
  type: 'messageDelete',
  toggleable: true,
  run: function (bot, msg) {
    let obj = {
      guildID: msg.channel.guild.id,
      channelID: msg.channel.id,
      type: 'Message Deleted',
      changed: `► From Channel: **${msg.channel.name}**\n► ID: **${msg.id}**`, // eslint-disable-line
      color: 8351671
    }
    if (!msg.timestamp) {
      obj.changed = `**⚠ Non-Cached Message Deleted**\n${obj.changed}`
      sendToLog(bot, obj)
    } else {
      if (msg.author.id !== bot.user.id && !badMessageCheck(msg.content) && !msg.author.bot) {
        if (msg.attachments.length !== 0) {
          sendToLog(bot, {
            guildID: msg.channel.guild.id,
            channelID: msg.channel.id,
            type: 'Message Deleted',
            changed: `► Content: \`${msg.content ? msg.content.replace(/\"/g, '"').replace(/`/g, '') : 'None.'}\`\n► Channel: **${msg.channel.name}**\n► Message ID: ${msg.id}\n► Contained an attachment, which you cannot view.`, // eslint-disable-line
            color: 8351671,
            against: {
              id: `${msg.author.id}`,
              username: `${msg.author.username}`,
              discriminator: `${msg.author.discriminator}`,
              avatar: `${msg.author.avatar}`
            }
          })
        }
        if (Object.keys(msg.embeds[0]).length !== 0) {
          sendToLog(bot, {
            guildID: msg.channel.guild.id,
            channelID: msg.channel.id,
            type: 'Message Deleted',
            changed: `► Content: \`${msg.content ? msg.content.replace(/\"/g, '"').replace(/`/g, '') : 'None.'}\`\n► Channel: **${msg.channel.name}**\n► Message ID: ${msg.id}\n► Embed: ⇓`, // eslint-disable-line
            color: 8351671,
            against: {
              id: `${msg.author.id}`,
              username: `${msg.author.username}`,
              discriminator: `${msg.author.discriminator}`,
              avatar: `${msg.author.avatar}`
            }
          })
          sendToLog(bot, msg.embeds[0], msg.channel.guild.id, msg.channel.id)
        } else {
          sendToLog(bot, {
            guildID: msg.channel.guild.id,
            channelID: msg.channel.id,
            type: 'Message Deleted',
            changed: `► Content: \`${msg.content ? msg.content.replace(/\"/g, '"').replace(/`/g, '') : 'None.'}\`\n► Channel: **${msg.channel.name}**\n► Message ID: ${msg.id}`, // eslint-disable-line
            color: 8351671,
            against: {
              id: `${msg.author.id}`,
              username: `${msg.author.username}`,
              discriminator: `${msg.author.discriminator}`,
              avatar: `${msg.author.avatar}`
            }
          })
        }
      }
    }
  }
}

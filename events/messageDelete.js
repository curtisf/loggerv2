import { badMessageCheck } from '../system/utils'
import { sendToLog } from '../system/modlog'
import { Redis } from '../Logger'
import { updateGuildDocument } from '../handlers/update'

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
      if (msg.author.id === bot.user.id) {

      } else if (msg.author.bot) {
        Redis.existsAsync(`${msg.channel.guild.id}:logBots`).then((exist) => {
          if (exist) {
            Redis.getAsync(`${msg.channel.guild.id}:logBots`).then((res) => {
              if (res === 'true') {
                processMessage(msg)
              }
            })
          } else {
            updateGuildDocument(msg.channel.guild.id, { 'logBots': false })
          }
        })
      } else if (!badMessageCheck(msg.content)) {
        processMessage(msg)
      }
      function processMessage (msg) {
        if (msg.attachments.length !== 0) {
          sendToLog(bot, {
            guildID: msg.channel.guild.id,
            channelID: msg.channel.id,
            type: 'Message Deleted',
            changed: `► Content: \`${msg.content ? msg.content.replace(/\"/g, '"').replace(/`/g, '') : 'None.'}\`\n► Channel: **${msg.channel.name}**\n► Message ID: ${msg.id}\n► [Attachment](https://cdn.discordapp.com/attachments/${msg.channel.id}/${msg.id}/${msg.attachments[0].filename}). <--- you might not be able to open this image.`, // eslint-disable-line
            color: 8351671,
            against: {
              id: `${msg.author.id}`,
              username: `${msg.author.username}`,
              discriminator: `${msg.author.discriminator}`,
              avatar: `${msg.author.avatar}`
            }
          })
        } else if (msg.embeds.length !== 0) {
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

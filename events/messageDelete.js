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
      obj.simple = `Unknown message deleted in: **${msg.channel.name}**`
      sendToLog(this.name, bot, obj)
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
        msg.mentions.forEach((mention) => {
          if (msg.channel.guild) { // I'm using this function because the regular cleanContent doesn't include the discriminator of the user
            var member = msg.channel.guild.members.get(mention.id)
            if (member && member.nick) {
              msg.content = msg.content.replace(new RegExp(`<@!?${mention.id}>`, 'g'), '@' + member.nick + '#' + member.discriminator)
            } else if (member) {
              msg.content = msg.content.replace(new RegExp(`<@!?${mention.id}>`, 'g'), '@' + mention.username + '#' + mention.discriminator)
            }
          }
        })
        if (msg.attachments.length !== 0) {
          let modlogEmbed = {
            guildID: msg.channel.guild.id,
            channelID: msg.channel.id,
            type: 'Message Deleted',
            changed: `► Content: \`${msg.content ? msg.content.replace(/\"/g, '"').replace(/`/g, '') : 'None.'}\`\n► ID: ${msg.id}\n► Channel: **${channel.name}**`, // eslint-disable-line
            color: 8351671,
            against: {
              id: `${msg.author.id}`,
              username: `${msg.author.username}`,
              discriminator: `${msg.author.discriminator}`,
              avatar: `${msg.author.avatar}`
            },
            simple: `A message with an attachment created by **${msg.author.username}#${msg.author.discriminator}** was deleted in ${msg.channel.name}.`,
          }
          if (msg.attachments[0].base64) {
            modlogEmbed.file = {
              name: 'messagepicture.png',
              file: Buffer.from(msg.attachments[0].base64, 'base64')
            }
            msg.attachments[0].base64 = null // save memory after a few days of caching images
          }
          sendToLog(module.exports.name, bot, modlogEmbed)
        } else if (msg.embeds.length !== 0) {
          sendToLog(module.exports.name, bot, {
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
            },
            simple: `A message with an embed created by **${msg.author.username}#${msg.author.discriminator}** was deleted in ${msg.channel.name}.`
          })
          sendToLog(module.exports.name, bot, msg.embeds[0], msg.channel.guild.id, msg.channel.id)
        } else {
          sendToLog(module.exports.name, bot, {
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
            },
            simple: `A message created by **${msg.author.username}#${msg.author.discriminator}** was deleted in ${msg.channel.name}.`
          })
        }
      }
    }
  }
}

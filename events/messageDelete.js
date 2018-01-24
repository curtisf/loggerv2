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
      Redis.getAsync(`${msg.id}:content`).then((content) => {
        Promise.all([Redis.getAsync(`${msg.id}:from`), Redis.getAsync(`${msg.id}:timestamp`), Redis.getAsync(`${msg.id}:image`)]).then((dataArr) => {
          let split = dataArr[0].split('|')
          let authorId = split[0]
          let authorUsername = split[1]
          let channelId = split[2]
          let guildId = split[3]
          let authorDiscriminator = split[4]
          let authorAvatar = split[5]
          let channel = bot.getChannel(channelId)
          sendToLog(this.name, bot, {
            guildID: guildId,
            channelID: channelId,
            type: 'Message Deleted',
              changed: `► Content: \`${content ? content.replace(/\"/g, '"').replace(/`/g, '') : 'None.'}\`\n► Channel: **${channel ? channel.name : 'Unknown'}**\n► Message ID: ${msg.id}`, // eslint-disable-line
            color: 8351671,
            timestamp: dataArr[1],
            against: {
              id: authorId,
              username: authorUsername,
              discriminator: authorDiscriminator,
              avatar: authorAvatar
            },
            simple: `A message created by **${authorUsername}#${authorDiscriminator}** was deleted in ${channel ? channel.name : 'an unknown channel'}.`,
            base64: dataArr[2]
          })
        }).catch(console.error)
      })
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
          Redis.existsAsync(msg.id).then((exist) => {
            if (exist) {
              Redis.getAsync(`${msg.id}:image`).then((base64) => {
                console.log('had base 64, sent to log')
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
                  simple: `A message with an attachment created by **${msg.author.username}#${msg.author.discriminator}** was deleted in ${msg.channel.name}. Look below for it.`,
                  base64: base64
                })
              })
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
                simple: `A message with an attachment created by **${msg.author.username}#${msg.author.discriminator}** was deleted in ${msg.channel.name}. Look below for it.`
              })
            }
          })
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

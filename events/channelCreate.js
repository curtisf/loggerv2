import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'channelCreate',
  type: 'channelCreate',
  toggleable: true,
  run: function (bot, channel) {
    let type
    if (channel.type === 0) {
      type = 'Text'
    } else if (channel.type === 2) {
      type = 'Voice'
    } else {
      type = 'Category'
    }
    let obj = {
      guildID: channel.guild.id,
      channelID: channel.id,
      type: `${type !== 'Category' ? `${type} Channel Created` : 'Category Created'}`,
      changed: `► Name: <#${channel.id}> (**${channel.name}**)\n► Type: **${type}**\n► ID: **${channel.id}**`,
      color: 8351671
    }
    channel.guild.getAuditLogs(1, null, 10).then((log) => {
      let user = log.users[0]
      obj.footer = {
        text: `Created by ${user.username}#${user.discriminator}`,
        icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${obj.against.discriminator % 5}.png`}`
      }
      sendToLog(bot, obj)
    }).catch(() => {
      obj.footer = {
        text: 'I cannot view audit logs!',
        icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
      }
      sendToLog(bot, obj)
    })
  }
}

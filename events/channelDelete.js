import { sendToLog } from '../system/modlog'
import { updateOverview } from '../handlers/read'

module.exports = {
  name: 'channelDelete',
  type: 'channelDelete',
  toggleable: true,
  run: function (bot, channel) {
    updateOverview(channel.guild.id)
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
      type: 'Channel Deleted',
      changed: `► Name: **${channel.name}**\n► Type: **${type}**\n► ID: **${channel.id}**\n► Position: **${channel.position}**`,
      color: 8351671
    }
    channel.guild.getAuditLogs(1, null, 12).then((log) => {
      if (channel.type === 2) {
        obj.changed += `\n► Bitrate: **${channel.bitrate}**`
      }
      if (channel.userlimit) {
        obj.changed += `\n► Userlimit: **${channel.userlimit}**`
      }
      let user = log.entries[0].user
      obj.footer = {
        text: `Deleted by ${user.username}#${user.discriminator}`,
        icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`}`
      }
      sendToLog(bot, obj)
    }).catch((e) => {
      obj.footer = {
        text: 'I cannot view audit logs!',
        icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
      }
      sendToLog(bot, obj)
    })
  }
}

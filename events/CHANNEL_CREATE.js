import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'channel_create',
  type: 'CHANNEL_CREATE',
  toggleable: true,
  run: function (bot, raw) {
    let channel = raw.channel
    let obj = {
      guildID: channel.guild.id,
      channelID: channel.id,
      type: 'Channel Created',
      changed: `► Name: <#${channel.id}> (**${channel.name}**)\n► Type: **${channel.type === 0 ? 'Text' : 'Voice'}**\n► ID: **${channel.id}**`, // TODO: When channel categories come out, handle type 4
      color: 8351671
    }
    getLastByType(channel.guild.id, 10, 1).then((log) => {
      let user = bot.Users.get(log[0].user_id)
      obj.footer = {
        text: `Created by ${user.username}#${user.discriminator}`,
        icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'}`
      }
      sendToLog(bot, obj)
    })
  }
}

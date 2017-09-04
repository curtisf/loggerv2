import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'channel_delete',
  type: 'CHANNEL_DELETE',
  toggleable: true,
  run: function (bot, raw, type) {
    let channel = raw.data
    let obj = {
      guildID: channel.guild_id,
      channelID: channel.id,
      type: 'Channel Deleted',
      changed: `► Name: **${channel.name}**\n► Type: **${channel.type === 0 ? 'Text' : 'Voice'}**\n► ID: **${channel.id}**`,
      color: 8351671
    }
    getLastByType(channel.guild_id, 12, 1).then((log) => {
      if (log[0]) {
      let user = bot.Users.get(log[0].user_id)
      obj.footer = {
        text: `Deleted by ${user.username}#${user.discriminator}`,
        icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'}`
      }
      sendToLog(bot, obj)
    }
    })
  }
}

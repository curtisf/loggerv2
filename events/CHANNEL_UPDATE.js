import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'
import { log } from '../system/log'
import { arraysEqual } from '../system/utils'

module.exports = {
  name: 'channel_update',
  type: 'CHANNEL_UPDATE',
  toggleable: true,
  run: function (bot, raw) {
    let changes = raw.getChanges()
    let before = changes.before
    let after = changes.after
    let beforeIds = before.permission_overwrites.map((overwrite) => `${overwrite.allow}|${overwrite.deny}`)
    let afterIds = after.permission_overwrites.map((overwrite) => `${overwrite.allow}|${overwrite.deny}`)
    if (before.position !== after.position) {
      sendToLog(bot, {
        guildID: after.guild_id,
        channelID: after.id,
        type: 'Channel Updated',
        changed: `► Name: **${after.name}**\n► Changed: **Position**\n► Now #**${after.position + 1}** in the channel list\n► Was #**${before.position + 1}** in the channel list`,
        color: 8351671
      })
    } else {
      getLastByType(before.guild_id, 11, 1).then((entryObj) => {
        if (entryObj[0].user_id) { // not defined for some reason
          let user = bot.Users.get(entryObj[0].user_id)
          if (arraysEqual(beforeIds, afterIds)) {
            let objChanges = entryObj[0].changes[0]
            sendToLog(bot, {
              guildID: after.guild_id,
              channelID: after.id,
              type: 'Channel Updated',
              changed: `► Changed: **${objChanges.key}**\n► Now: \`${objChanges.new_value ? objChanges.new_value : 'None'}\`\n► Was: \`${objChanges.old_value ? objChanges.old_value : 'None'}\``,
              color: 8351671,
              footer: {
                text: `Updated by ${user.username}#${user.discriminator}`,
                icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'}`
              }
            })
          } else {
            sendToLog(bot, {
              guildID: after.guild_id,
              channelID: after.id,
              type: 'Channel Overwrites Modified',
              changed: `► Name: \`${after.name}\`\n► Changed: **Not Supported**\n► ID: **${after.id}**`,
              color: 8351671 // no footer because of some problems reported by a user.
            })
          }
        }
      }).catch((e) => {
        if (e.status !== 403) {
          log.error(e)
        }
        sendToLog(bot, {
          guildID: after.guild_id,
          channelID: after.id,
          type: 'Channel Updated',
          changed: 'Unknown',
          color: 8351671
        })
      })
    }
  }
}

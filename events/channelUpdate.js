import { sendToLog } from '../system/modlog'
import { deepCompare, toTitleCase } from '../system/utils'

module.exports = {
  name: 'channelUpdate',
  type: 'channelUpdate',
  toggleable: true,
  run: function (bot, raw) {
    let now = raw.newChannel
    let before = raw.oldChannel
    let guild = raw.newChannel.guild
    if (now.position === before.position) {
      if (now.permissionOverwrites.size > before.permissionOverwrites.size) {
        guild.getAuditLogs(1, null, 13).then((log) => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Created',
            changed: `► Channel: **${now.name}** (${now.id})\n► Type: **${log.entries[0].role ? 'Role' : 'Member'}**\n► Against: **${log.entries[0].role ? `${log.entries[0].role.name}` : `${log.entries[0].member.username}#${log.entries[0].member.discriminator}`}**`,
            color: 8351671,
            footer: {
              text: `Created by ${log.entries[0].user.username}#${log.entries[0].user.discriminator}`,
              icon_url: `${log.entries[0].user.avatar ? `https://cdn.discordapp.com/avatars/${log.entries[0].user.id}/${log.entries[0].user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${log.entries[0].user.discriminator % 5}.png`}`
            }
          })
        }).catch(() => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Deleted',
            changed: `► Channel: **${now.name}**\n► ID: **${now.id}**`,
            color: 8351671,
            footer: {
              text: 'I cannot view audit logs!',
              icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
            }
          })
        })
      } else if (now.permissionOverwrites.size < before.permissionOverwrites.size) {
        guild.getAuditLogs(1, null, 15).then((log) => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Deleted',
            changed: `► Channel: **${now.name}** (${now.id})\n► Type: **${log.entries[0].role ? 'Role' : 'Member'}**\n► Against: **${log.entries[0].role ? `${log.entries[0].role.name}` : `${log.entries[0].member.username}#${log.entries[0].member.discriminator}`}**`,
            color: 8351671,
            footer: {
              text: `Deleted by ${log.entries[0].user.username}#${log.entries[0].user.discriminator}`,
              icon_url: `${log.entries[0].user.avatar ? `https://cdn.discordapp.com/avatars/${log.entries[0].user.id}/${log.entries[0].user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${log.entries[0].user.discriminator % 5}.png`}`
            }
          })
        }).catch(() => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Deleted',
            changed: `► Channel: **${now.name}**\n► ID: **${now.id}**`,
            color: 8351671,
            footer: {
              text: 'I cannot view audit logs!',
              icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
            }
          })
        })
      } else if (now.permissionOverwrites.map(o => `${o.allow}|${o.deny}`).toString() !== before.permissionOverwrites.map(o => `${o.allow}|${o.deny}`).toString()) {
        guild.getAuditLogs(1, null, 14).then((log) => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Updated',
            changed: `► Channel: **${now.name}** (${now.id})\n► Type: **${log.entries[0].role ? 'Role' : 'Member'}**\n► Against: **${log.entries[0].role ? `${log.entries[0].role.name}` : `${log.entries[0].member.username}#${log.entries[0].member.discriminator}`}**`,
            color: 8351671,
            footer: {
              text: `Updated by ${log.entries[0].user.username}#${log.entries[0].user.discriminator}`,
              icon_url: `${log.entries[0].user.avatar ? `https://cdn.discordapp.com/avatars/${log.entries[0].user.id}/${log.entries[0].user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${log.entries[0].user.discriminator % 5}.png`}`
            }
          })
        }).catch(() => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Deleted',
            changed: `► Channel: **${now.name}**\n► ID: **${now.id}**`,
            color: 8351671,
            footer: {
              text: 'I cannot view audit logs!',
              icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
            }
          })
        })
      } else {
        guild.getAuditLogs(1, null, 11).then((log) => {
          let user = log.entries[0].user
          let beforeProps = Object.keys(log.entries[0].before).map((key) => {
            return {
              'property': key,
              'value': log.entries[0].before[key]
            }
          })
          let diffs
          if (now.type === 2) {
            diffs = deepCompare(now, beforeProps, true)
          } else {
            diffs = deepCompare(now, beforeProps, null)
          }
          if (diffs) {
            let changes = diffs.map((diff) => {
              return {
                'name': `**${diff.property !== 'nsfw' ? toTitleCase(diff.property) : 'NSFW'}**`,
                'value': `► Now: \`${log.entries[0].after[diff.property]}\`\n► Was: \`${log.entries[0].before[diff.property]}\``
              }
            })
            let obj = {
              guildID: guild.id,
              channelID: now.id,
              type: 'Channel Updated',
              changed: `► **Channel Changes**`,
              color: 8351671,
              footer: {
                text: `Updated by ${user.username}#${user.discriminator}`,
                icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`}`
              }
            }
            sendToLog(bot, obj, null, null, changes)
          }
        }).catch(() => {
          sendToLog(bot, {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Deleted',
            changed: `► Channel: **${now.name}**\n► ID: **${now.id}**`,
            color: 8351671,
            footer: {
              text: 'I cannot view audit logs!',
              icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
            }
          })
        })
      }
    }
  }
}

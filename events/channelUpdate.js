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
      if (before.permissionOverwrites.size > now.permissionOverwrites.size) {
        guild.getAuditLogs(1, null, 15).then((log) => {
          let overwrite = before.permissionOverwrites.map(o => o)[before.permissionOverwrites.size - 1]
          let fields = []
          log.entries[0].member = log.entries[0].member.username ? log.entries[0].member : guild.members.get(log.entries[0].member.id)
          let user = log.users.filter(u => u.id !== log.entries[0].member.id)[0]
          let obj = {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Deleted',
            changed: `► Channel: **${now.name}**\n► ID: **${now.id}**\n► Type: **${overwrite.type}**\n► Affected: **${log.entries[0].member.username}#${log.entries[0].member.discriminator}**`,
            color: 8351671,
            footer: {
              text: `Deleted by ${user.username}#${user.discriminator}`,
              icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`}`
            }
          }
          let keys = Object.keys(overwrite.json)
          if (keys.length === 0) {
            fields.push({
              'name': 'Permissions',
              'value': 'None.'
            }, {
              name: 'Info',
              value: `Affected: **${log.entries[0].member.username}#${log.entries[0].member.discriminator}**`
            })
            sendToLog(bot, obj, null, null, fields)
          } else {
            let allowed = []
            let denied = []
            keys.forEach(k => {
              if (overwrite.json[k] === true) {
                allowed.push(`**${k}**`)
              } else {
                denied.push(`**${k}**`)
              }
            })
            fields.push({
              'name': 'Info',
              'value': `Channel: **${now.name}**\nID: **${now.id}**\nType: **${overwrite.type}**\n► Affected: **${log.entries[0].member.username}#${log.entries[0].member.discriminator}**`
            })
            fields.push({
              'name': 'Allowed',
              'value': allowed.length !== 0 ? allowed.join('\n') : 'None Set'
            }, {
              'name': 'Denied',
              'value': denied.length !== 0 ? denied.join('\n') : 'None Set'
            })
            fields.push({
              'name': `Type`,
              'value': `**${overwrite.type}**`
            })
            sendToLog(bot, obj, null, null, fields)
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
      } else if (before.permissionOverwrites.size < now.permissionOverwrites.size) {
        guild.getAuditLogs(1, null, 13).then((log) => {
          let overwrite = now.permissionOverwrites.map(o => o)[now.permissionOverwrites.size - 1]
          let fields = []
          let allowed = []
          let denied = []
          let keys = Object.keys(overwrite.json)
          keys.forEach(k => {
            if (overwrite.json[k] === true) {
              allowed.push(`**${k}**`)
            } else {
              denied.push(`**${k}**`)
            }
          })
          fields.push({
            'name': 'Allowed',
            'value': allowed.length !== 0 ? allowed.join('\n') : 'None Set'
          }, {
            'name': 'Denied',
            'value': denied.length !== 0 ? denied.join('\n') : 'None Set'
          })
          log.entries[0].member = log.entries[0].member.username ? log.entries[0].member : guild.members.get(log.entries[0].member.id)
          let user = log.users.filter(u => u.id !== log.entries[0].member.id)[0]
          fields.push({
            name: 'Info',
            value: `Channel: **${now.name}**\nID: **${now.id}**\nType of overwrite: **${overwrite.type}**\n${overwrite.type === 'role' ? `Role: **${guild.roles.filter(r => r.id === log.entries[0].targetID).name}**` : `Member: **${log.entries[0].member.username}#${log.entries[0].member.discriminator}**`}`
          })
          let obj = {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Created',
            changed: `Channel: **${now.name}**\nID: **${now.id}**\nType of overwrite: **${overwrite.type}**\n${overwrite.type === 'role' ? `Role: **${guild.roles.filter(r => r.id === log.entries[0].targetID).name}**` : `Member: **${log.entries[0].member.username}#${log.entries[0].member.discriminator}**`}`,
            color: 8351671,
            footer: {
              text: `Created by ${user.username}#${user.discriminator}`,
              icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`}`
            }
          }
          fields.push({
            'name': `Type`,
            'value': `**${overwrite.type}**`
          })
          sendToLog(bot, obj, null, null, fields)
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
      } else if (before.permissionOverwrites.map(o => `${o.allow}|${o.deny}`).toString() !== now.permissionOverwrites.map(o => `${o.allow}|${o.deny}`).toString()) {
        guild.getAuditLogs(1, null, 14).then((log) => {
          log.entries[0].member = log.entries[0].member.username ? log.entries[0].member : guild.members.get(log.entries[0].member.id)
          let user = log.users.filter(u => u.id !== log.entries[0].member.id)[0]
          let obj = {
            guildID: guild.id,
            channelID: now.id,
            type: 'Channel Overwrite Updated',
            changed: `Channel: **${now.name}**\nID: **${now.id}**\nAffected: ${log.entries[0].role ? `**${log.entries[0].role.name}**` : `**${log.users[1].username}#${log.users[1].discriminator}**`}`,
            color: 8351671,
            footer: {
              text: `Updated by ${user.username}#${user.discriminator}`,
              icon_url: `${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`}`
            }
          }
          sendToLog(bot, obj)
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
          log.entries[0].member = log.entries[0].member.username ? log.entries[0].member : guild.members.get(log.entries[0].member.id)
          let user = log.users.filter(u => u.id !== log.entries[0].member.id)[0]
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

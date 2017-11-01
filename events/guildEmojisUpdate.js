import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'guildEmojisUpdate',
  type: 'guildEmojisUpdate',
  toggleable: true,
  run: function (bot, raw) {
    let newEmojis = raw.newEmojis
    let oldEmojis = raw.oldEmojis
    let guild = raw.guild
    let obj = {
      guildID: guild.id,
      type: 'Emoji ',
      changed: ``,
      color: 8351671
    }
    if (oldEmojis.length > newEmojis.length) {
      obj.type += 'Deleted' // 62
      guild.getAuditLogs(1, null, 62).then((log) => {
        let emoji = oldEmojis[oldEmojis.length - 1]
        let user = log.entries[0].user
        obj.changed += `► Name: **${emoji.name}**\n► ID: **${emoji.id}**\n► Managed: **${emoji.managed ? 'Yes' : 'No'}**\n► Restricted to role: **${emoji.roles.length !== 0 ? 'Yes' : 'No'}**`
        obj.from = user
        sendToLog(bot, obj)
      }).catch(() => {})
    } else if (newEmojis.length > oldEmojis.length) {
      obj.type += `Created` // 60
      guild.getAuditLogs(1, null, 60).then((log) => {
        let emoji = newEmojis[newEmojis.length - 1]
        let user = log.entries[0].user
        obj.changed += `► Emoji: <:${emoji.name}:${emoji.id}>\n► Name: **${emoji.name}**\n► ID: **${emoji.id}**`
        obj.from = user
        sendToLog(bot, obj)
      }).catch(() => {})
    } else {
      obj.type += `Updated` // 61
      guild.getAuditLogs(1, null, 61).then((log) => {
        let user = log.entries[0].user
        obj.from = user
        let emoji = guild.emojis.filter(e => e.id === log.entries[0].targetID)[0]
        if (log.entries[0].before.name !== log.entries[0].after.name) {
          obj.changed += `► Emoji: <:${emoji.name}:${emoji.id}>\n► Now: **${emoji.name}**\n► Previously: **${log.entries[0].before.name}**\n► ID: **${emoji.id}**`
          sendToLog(bot, obj)
        } else {
          obj.changed += `❗ **Possible Unsupported Emoji Change!**\n► Emoji: <:${emoji.name}:${emoji.id}>\n► What changed: **${Object.keys(log.entries[0].after)[0]}**\n► Now: **${log.entries[0].after[Object.keys(log.entries[0].after)[0]]}**\n► Was: **${log.entries[0].before[Object.keys(log.entries[0].before)[0]]}**`
          sendToLog(bot, obj)
        }
      }).catch(() => {})
    }
  }
}

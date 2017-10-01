import { sendToLog } from '../system/modlog'

module.exports = {
  name: 'guildUpdate',
  type: 'guildUpdate',
  toggleable: true,
  run: function (bot, raw) {
    let newGuild = raw.newGuild
    let oldGuild = raw.oldGuild
    let fields = []
    newGuild.getAuditLogs(1, null, 1).then((log) => {
      let arr
      if (Object.keys(log.entries[0].before) > Object.keys(log.entries[0].after)) {
        arr = Object.keys(log.entries[0].before)
      } else {
        arr = Object.keys(log.entries[0].after)
      }
      arr.forEach((key) => {
        if (((oldGuild[key]) && (newGuild[key])) && oldGuild[key] !== newGuild[key]) { // if both guilds have the property and they don't equal eachother
          let data = handle(key, log)
          fields.push(data)
        }
      })
      if (fields.length !== 0) {
        sendToLog(bot, {
          guildID: newGuild.id,
          type: 'Guild Updated',
          changed: 'You shouldn\'t be seeing this.',
          color: 8351671,
          from: log.entries[0].user
        }, null, null, fields)
      }
    }).catch(() => {})
    function handle (name, log) {
      let after = 'None'
      let before = 'None'
      switch (name) {
        case 'system_channel_id':
          if (log.entries[0].before.system_channel_id) {
            before = bot.getChannel(log.entries[0].before.system_channel_id).name
          }
          if (log.entries[0].after.system_channel_id) {
            after = bot.getChannel(log.entries[0].after.system_channel_id).name
          }
          return {
            name: 'Welcome Message Channel',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'afk_timeout':
          if (log.entries[0].before.afk_timeout) {
            before = log.entries[0].before.afk_timeout / 60
          }
          if (log.entries[0].after.afk_timeout) {
            after = log.entries[0].after.afk_timeout / 60
          }
          return {
            name: 'AFK Timeout',
            value: `► Now: **${after}** minutes\n► Was: **${before}** minutes`
          }
        case 'default_message_notifications':
          if (log.entries[0].before.default_message_notifications) {
            before = log.entries[0].before.default_message_notifications === 0 ? 'All Messages' : 'Mentions'
          }
          if (log.entries[0].after.default_message_notifications) {
            after = log.entries[0].after.default_message_notifications === 0 ? 'All Messages' : 'Mentions'
          }
          return {
            name: 'Message Notifications',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'afk_channel_id':
          before = bot.getChannel(log.entries[0].before.afk_channel_id).name || 'None'
          after = bot.getChannel(log.entries[0].after.afk_channel_id).name || 'None'
          return {
            name: 'AFK Channel',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'name':
          before = log.entries[0].before.name
          after = log.entries[0].after.name
          return {
            name: 'Name',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'region':
          before = log.entries[0].before.region
          after = log.entries[0].after.region
          return {
            name: 'Region',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'icon':
          before = 'Not Available'
          after = newGuild.icon ? `[This](\`https://cdn.discordapp.com/icons/${newGuild.id}/${newGuild.icon}.jpg\`)` : 'None'
          return {
            name: 'Icon',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'features':
          before = 'Not Available'
          after = 'Not Available'
          return {
            name: 'Features ⚠ Possibly Dangerous!',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
        case 'splash':
          before = 'Not Available'
          after = 'Not Available'
          return {
            name: 'Splash Image ⚠ Possibly Dangerous!',
            value: `► Now: **${after}**\n► Was: **${before}**`
          }
      }
    }
  }
}

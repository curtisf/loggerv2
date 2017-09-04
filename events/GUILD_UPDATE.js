import { log } from '../system/log'
import { sendToLog } from '../system/modlog'
import { getLastByType } from '../handlers/audit'

module.exports = {
  name: 'server_update',
  type: 'GUILD_UPDATE',
  toggleable: true,
  run: function (bot, raw) {
    let changes = raw.getChanges()
    let before = changes.before
    let after = changes.after
    getLastByType(before.id, 1, 1).then((entryObj) => {
      if (entryObj[0]) {
      let objChanges = entryObj[0].changes.map((change) => `► Type: **${change.key.replace(/_/g, ' ') === 'system channel id' ? 'Welcoming Channel' : change.key.replace(/_/g, ' ')}**\n► Was: **${change.old_value ? change.key.replace(/_/g, ' ') === 'system channel id' ? `<#${change.old_value}>` : change.old_value : 'None'}**\n► Now: **${change.new_value ? change.key.replace(/_/g, ' ') === 'system channel id' ? `<#${change.new_value}>` : change.new_value : 'None'}**\n`) // TODO: add a switch statement to determine friendly names
      let user = bot.Users.get(entryObj[0].user_id)
      sendToLog(bot, {
        guildID: after.id,
        type: 'Guild Updated',
        changed: `Changed:\n${objChanges.join('\n')}`,
        color: 8351671,
        from: user
      })
    }
    }).catch((e) => {
      if (e.status !== 403) {
        log.error(e)
      }
      sendToLog(bot, {
        guildID: after.id,
        type: 'Guild Updated',
        changed: 'Unknown',
        color: 8351671
      })
    })
  }
}

import * as request from 'superagent'
import { bot } from '../Logger'
const Config = require('../botconfig.json')

function getLastByType (guildID, type, num) {
  return new Promise((resolve, reject) => {
    request
    .get(`https://discordapp.com/api/guilds/${guildID}/audit-logs?${type ? `action_type=${type}&` : ''}limit=${num || 1}`)
    .set(`Authorization`, `Bot ${Config.core.token}`)
    .end((err, res) => {
      if (err) {
        if (err.statusCode === '429') {
          bot.DirectMessageChannels.getOrOpen(bot.Users.get('214481696400211969')).then((DMC) => {
            DMC.sendMessage('I just got a 429 while fetching from the audit logs!')
          })
        }
        reject(err)
      } else {
        resolve(res.body.audit_log_entries)
      }
    })
  })
}

export { getLastByType }

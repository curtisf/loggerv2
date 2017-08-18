import * as request from 'superagent'
import { Redis } from '../Logger'
const Config = require('../config.json')

function getLastByType (guildID, type, num) {
  return new Promise((resolve, reject) => {
    request
    .get(`https://discordapp.com/api/guilds/${guildID}/audit-logs?${type ? `action_type=${type}&` : ''}limit=${num || 1}`)
    .set(`Authorization`, `Bot ${Config.core.token}`)
    .end((err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res.body.audit_log_entries)
      }
    })
  })
}

export { getLastByType }

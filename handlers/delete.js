import { r } from '../system/rethinkclient'
const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(process.env.RAVEN_URI).install()

function deleteGuildDocument (guildID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).delete().run().then((res) => {
      if (res.deleted) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}

export { deleteGuildDocument }

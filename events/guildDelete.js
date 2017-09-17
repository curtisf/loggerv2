import { deleteGuildDocument } from '../handlers/delete'
import { log } from '../system/log'

module.exports = {
  toggleable: false,
  run: function (bot, guild) {
    deleteGuildDocument(guild.id).then((res) => {
      if (res === true) {
        log.info(`Left and deleted guild information for ${guild.name} (${guild.id}).`)
      } else {
        log.error(`I couldn't delete guild information for ${guild.name} (${guild.id})!`, res)
      }
    })
  }
}

import { getLogChannel } from '../handlers/read'
import { createGuild } from '../handlers/create'
import { log } from '../system/log'

module.exports = {
  toggleable: false,
  run: function (bot, raw) {
    let guild = raw.guild
    if (!raw.becameAvailable) {
      createGuild(guild)
    }
  }
}

import { createGuild } from '../handlers/create'

module.exports = {
  toggleable: false,
  run: function (bot, raw) {
    let guild = raw.guild
    if (!raw.becameAvailable) {
      createGuild(guild)
    }
  }
}

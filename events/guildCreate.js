import { createGuild } from '../handlers/create'

module.exports = {
  toggleable: false,
  run: function (bot, guild) {
    createGuild(guild)
  }
}

import { addNewName } from '../handlers/update'

module.exports = {
  toggleable: false,
  run: function (bot, raw) {
    if (raw.user.username !== raw.old.username) {
      addNewName(raw.user.id, raw.user.username)
    }
  }
}

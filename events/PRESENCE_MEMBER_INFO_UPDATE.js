import { addNewName } from '../handlers/update'

module.exports = {
  toggleable: false,
  run: function (bot, raw) {
    if (raw.old.username !== raw.new.username) {
      addNewName(raw.new.id, raw.new.username)
    }
  }
}

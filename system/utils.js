const Config = require('../config.json')

function badMessageCheck (content) {
  if (/([\u0900-\u097f]|\uFDFD|\u0BF5|\u0BCC)/.test(content) === true) {
    return true
  } else {
    return false
  }
}

function arraysEqual (a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function checkCanUse (id, command) {
  if (Config.commands[command].indexOf(id) > -1) {
    return true
  } else {
    return false
  }
}

function checkIfAllowed (msg) {
  let userPerms = msg.author.permissionsFor(msg.guild)
  let isDev = checkCanUse(msg.author.id, 'eval')
  if (isDev) {
    return true
  } else if (msg.author.id === msg.guild.owner_id) {
    return true
  } else if (userPerms.General.ADMINISTRATOR || userPerms.General.MANAGE_GUILD) {
    return true
  } else {
    return false
  }
}

export { badMessageCheck, arraysEqual, checkCanUse, checkIfAllowed }

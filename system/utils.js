const Config = require('../botconfig.json')
const Raven = require('raven')
Raven.config(Config.raven.url).install()
let channelProperties = [
  'name',
  'position',
  'topic',
  'nsfw'
]

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

function deepCompare (a, beforeProps, isVoice) {
  if (isVoice) {
    channelProperties.splice(channelProperties.indexOf('nsfw'), 1)
    channelProperties.splice(channelProperties.indexOf('topic'), 1)
    channelProperties.push('bitrate')
  } else {
    let diff = []
    beforeProps.forEach((before) => {
      if (a[before.property] !== before.value || a[before.property].toString().length !== before.value.toString().length) {
        diff.push({
          property: before.property,
          value: a[before.property]
        })
      }
    })
    if (diff.length !== 0) {
      return diff
    } else {
      return false
    }
  }
}

function checkCanUse (id, command) {
  if (Config.commands[command].indexOf(id) > -1) {
    return true
  } else {
    return false
  }
}

function checkIfAllowed (msg) {
  let userPerms = msg.channel.guild.members.get(msg.author.id).permission.json
  let isDev = checkCanUse(msg.author.id, 'eval')
  if (isDev) {
    return true
  } else if (msg.author.id === msg.channel.guild.ownerID) {
    return true
  } else if (userPerms.administrator || userPerms.manageGuild) {
    return true
  } else {
    return false
  }
}

function toTitleCase (str) {
  return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase() })
}

function getChangedOverwrite (now, before) {
  // This assumes that both arrays are the same length.
  for (let i = 0; i < now.length; i++) {
    if ((now[i].allow !== before[i].allow) && (now[i].deny !== before[i].deny)) {
      return now[i]
    }
  }
}

function hasUnicode (text) {
  return /[^\u0000-\u00ff]/.test(text)
}

export { badMessageCheck, arraysEqual, checkCanUse, checkIfAllowed, deepCompare, toTitleCase, getChangedOverwrite, hasUnicode }

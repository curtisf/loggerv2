let permissionSpec = { General:
{ CREATE_INSTANT_INVITE: 1,
  KICK_MEMBERS: 2,
  BAN_MEMBERS: 4,
  ADMINISTRATOR: 8,
  MANAGE_CHANNELS: 16,
  MANAGE_GUILD: 32,
  CHANGE_NICKNAME: 67108864,
  MANAGE_NICKNAMES: 134217728,
  MANAGE_ROLES: 268435456,
  MANAGE_WEBHOOKS: 536870912,
  MANAGE_EMOJIS: 1073741824 },
  Text:
  { READ_MESSAGES: 1024,
    SEND_MESSAGES: 2048,
    SEND_TTS_MESSAGES: 4096,
    MANAGE_MESSAGES: 8192,
    EMBED_LINKS: 16384,
    ATTACH_FILES: 32768,
    READ_MESSAGE_HISTORY: 65536,
    MENTION_EVERYONE: 131072,
    EXTERNAL_EMOTES: 262144,
    ADD_REACTIONS: 64 },
  Voice:
  { CONNECT: 1048576,
    SPEAK: 2097152,
    MUTE_MEMBERS: 4194304,
    DEAFEN_MEMBERS: 8388608,
    MOVE_MEMBERS: 16777216,
    USE_VAD: 33554432 } }

function getPerms (raw) {
  this.raw = raw || 0
  for (let type in permissionSpec) {
    this[type] = {}
    for (let permission in permissionSpec[type]) {
      const bit = permissionSpec[type][permission]
      Object.defineProperty(this[type], permission, {
        enumerable: true,
        get: () => (this.raw & bit) === bit,
        set: (v) => v ? (this.raw |= bit) : (this.raw &= ~bit)
      })
    }
    Object.seal(this[type])
  }
  Object.seal(this)
  return this
}

module.exports = getPerms

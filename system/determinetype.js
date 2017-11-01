function typeName (type) {
  switch (type) {
    case 1:
      return 'Server Updated'
    case 10:
      return 'Channel Created'
    case 11:
      return 'Channel Updated'
    case 12:
      return 'Channel Deleted'
    case 13:
      return 'Channel Overwrite Created'
    case 14:
      return 'Channel Overwrite Updated'
    case 15:
      return 'Channel Overwrite Deleted'
    case 20:
      return 'Member Kicked'
    case 21:
      return 'Member Prune'
    case 22:
      return 'Member Banned'
    case 23:
      return 'Member Unbanned'
    case 24:
      return 'Member Updated'
    case 25:
      return 'Role Added To Member'
    case 30:
      return 'Role Created'
    case 31:
      return 'Role Updated'
    case 32:
      return 'Role Deleted'
    case 40:
      return 'Invite Created'
    case 41:
      return 'Invite Updated'
    case 42:
      return 'Invite Deleted'
    case 50:
      return 'Webhook Created'
    case 51:
      return 'Webhook Updated'
    case 52:
      return 'Webhook Deleted'
    case 60:
      return 'Emoji Created'
    case 61:
      return 'Emoji Updated'
    case 62:
      return 'Emoji Deleted'
    case 72:
      return 'Message Deleted'
    default:
      return 'Invalid'
  }
}

export { typeName }

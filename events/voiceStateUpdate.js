import { sendToLog } from '../system/modlog'

module.exports = {
    name: 'voiceStateUpdate',
    type: 'voiceStateUpdate',
    toggleable: true,
    run: function (bot, timeState) {
        let member = timeState.member
        let oldState = timeState.old
        let obj = {
            guildID: member.guild.id,
            type: 'Member ',
            changed: `► Name: **${member.username}#${member.discriminator}**\n► ID: **${member.id}**`,
            color: 8351671,
            simple: `**${member.username}#${member.discriminator}** was `,
            against: member,
            from: null
        }
        if (oldState.mute && !member.voiceState.mute) {
            obj.type += 'Unmuted'
            fetchAndPopulate() // This exists so that only these few conditions will trigger an audit log fetch, and as thus, help prevent hitting ratelimits
        } else if (!oldState.mute && member.voiceState.mute) {
            obj.type += 'Muted'
            fetchAndPopulate()
        } else if (oldState.deaf && !member.voiceState.deaf) {
            obj.type += 'Undeafened'
            fetchAndPopulate()
        } else if (!oldState.deaf && member.voiceState.deaf) {
            obj.type += 'Deafened'
            fetchAndPopulate()
        }
        function fetchAndPopulate() {
            member.guild.getAuditLogs(1, null, 24).then((log) => {
                let user = log.entries[0].user
                obj.from = user
                obj.simple += `${obj.type.split(' ')[1].toLowerCase()} by ${user.username}#${user.discriminator}`
                obj.changed += `\n► By: **${user.username}#${user.discriminator}**\n► ID: **${user.id}**\n► Channel: **${bot.getChannel(member.voiceState.channelID).name}**`
                sendToLog(module.exports.name, bot, obj)
            }).catch(() => {
                obj.simple += `${obj.type.split(' ')[1].toLowerCase()}`
                obj.changed += `\n► Channel: **${bot.getChannel(member.voiceState.channelID).name}**`
                obj.footer = {
                    text: 'I cannot view audit logs!',
                    icon_url: 'http://www.clker.com/cliparts/C/8/4/G/W/o/transparent-red-circle-hi.png'
                  }
            })
        }
    }
}

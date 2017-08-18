import { log } from '../system/log'
import { r } from '../system/rethinkclient'
import { createUserDocument, recoverGuild } from './create'
import { loadToRedis } from './read'

function updateGuildDocument (guildID, toUpdate) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).update(toUpdate).run().then((response) => {
      if (response.replaced || response.skipped || response.unchanged) {
        resolve(true)
        loadToRedis(guildID)
      } else {
        resolve(response)
      }
    })
  })
}

function updateUserDocument (userID, toUpdate) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Users').get(userID).update(toUpdate).run().then((response) => {
      if (response.replaced || response.skipped || response.unchanged) {
        resolve(true)
      } else {
        resolve(response)
      }
    }).catch(() => {
      log.warn(`Missing a user document for ${userID}, recovering...`)
      createUserDocument(userID).then((res) => {
        if (res === true) {
          log.info(`Created user document for ${userID}!`)
        } else {
          log.error(res)
        }
      })
      resolve(false)
    })
  })
}

function addNewName (userID, nameStr) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Users').get(userID).run().then((userDoc) => {
      userDoc.names.push(nameStr)
      r.db('Logger').table('Users').get(userID).update({'names': userDoc.names}).run().then((response) => {
        if (response.replaced || response.skipped || response.unchanged) {
          resolve(true)
        } else {
          resolve(response)
        }
      })
    }).catch(() => {
      log.warn(`Missing a user document for ${userID}, recovering...`)
      createUserDocument(userID).then((res) => {
        if (res === true) {
          log.info(`Created user document for ${userID}!`)
          r.db('Logger').table('Users').get(userID).update({'names': [nameStr]}).run().then((response) => {
            if (response.replaced || response.skipped || response.unchanged) {
              resolve(true)
            } else {
              resolve(response)
            }
          })
        } else {
          log.error(res)
        }
      })
    })
  })
}

function getInvites (guildID) {
  return new Promise((resolve, reject) => {
    r.db('Logger').table('Guilds').get(guildID).run().then((doc) => {
      if (doc) {
        resolve(doc.invites)
      } else {
        recoverGuild(guildID)
      }
    })
  })
}

export { updateGuildDocument, updateUserDocument, addNewName }

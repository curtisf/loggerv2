const express = require('express')
const https = require('https')
const fs = require('fs')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const passport = require('passport')
const Strategy = require('passport-discord').Strategy
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const db = require('./db/handler')
const Config = require('./dashconfig.json')
const botConfig = require('./botconfig.json')
const redis = require('redis')
const RedisStore = require('connect-redis')(session)
const client = redis.createClient()
const superagent = require('superagent')
const Raven = require('raven')
Raven.config(botConfig.raven.url).install()

if (!process.send) {
  console.log('WARNING: This process was launched separately from the bot, IPC will not work!')
}

passport.serializeUser(function (user, done) {
  done(null, user)
})
passport.deserializeUser(function (obj, done) {
  done(null, obj)
})

var scopes = ['identify', 'guilds']

passport.use(new Strategy({
  clientID: Config.oauth.clientID,
  clientSecret: Config.oauth.secret,
  callbackURL: Config.devmode === true ? `http://${Config.devIP}:8000/callback` : 'https://whatezlife.com/dashboard/callback',
  scope: scopes
}, function (accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    return done(null, profile)
  })
}))

app.use(express.static('assets'))
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  secret: Config.sessionSecret,
  // create new redis store.
  store: new RedisStore({ host: 'localhost', port: 6379, client: client, ttl: 600000 }),
  saveUninitialized: false,
  resave: false
}))
app.use(passport.initialize())
app.use(passport.session())
if (Config.devmode === false) {
  app.use(function (req, res, next) {
    if (!req.secure) {
      return res.redirect(['https://', req.get('Host'), req.url].join(''))
    }
    next()
  })
}
app.set('view engine', 'jade')
app.locals.basedir = path.join(__dirname, 'views')

let allEvents = [
  'channelCreate',
  'channelUpdate',
  'channelDelete',
  'guildBanAdd',
  'guildBanRemove',
  'guildRoleCreate',
  'guildRoleDelete',
  'guildRoleUpdate',
  'guildUpdate',
  'messageDelete',
  'messageDeleteBulk',
  'messageReactionRemoveAll',
  'messageUpdate',
  'guildMemberAdd',
  'guildMemberRemove',
  'guildMemberUpdate',
  'voiceChannelLeave',
  'guildEmojisUpdate' ]

app.get('/modules/:id', checkAuth, function (req, res) {
  if (!isNaN(req.params.id)) {
    let guild = req.user.guilds.filter(guild => guild.id === req.params.id)[0]
    if (guild) {
      getUserPermsGuild(req.user.id, guild.id).then((fullPerms) => {
        if (fullPerms.administrator || fullPerms.manageGuild || guild.owner === true) {
          db.getGuild(req.params.id).then((guild) => {
            let enabledEvents = allEvents.slice()
            guild.disabledEvents.forEach((event) => {
              if (enabledEvents.indexOf(event) !== -1) {
                enabledEvents.splice(enabledEvents.indexOf(event), 1)
              }
            })
            res.render('test', {guildID: req.params.id, enabled: enabledEvents, disabled: guild.disabledEvents})
          }).catch(() => {
            res.render('error', {message: 'This server doesn\'t exist!'})
          })
        } else {
          res.render('error', {message: 'You lack the permissions to edit this server!'})
        }
      })
    } else {
      res.render('error', {message: 'This server doesn\'t exist!'})
    }
  } else {
    res.render('error', {message: 'Missing or Malformed Server ID'})
  }
})

app.get('/channels/:id', checkAuth, function (req, res) {
  if (req.params.id) {
    getUserPerms(req.user.id, 'guild', req.params.id).then((perms) => {
      if (perms) {
        if (perms.administrator || perms.manageGuild) {
          getChannels(req.params.id).then((channels) => {
            if (channels) {
              let objs = []
              channels.forEach((ch) => {
                objs.push({
                  name: ch.name,
                  id: ch.id
                })
              })
              db.getGuild(req.params.id).then((doc) => {
                if (doc.logchannel) {
                  getChannelInfo(doc.logchannel).then((ch) => {
                    if (ch) {
                      objs = objs.filter(ch => ch.id !== doc.logchannel)
                      res.render('logandignore', {channelList: objs,
                        guildID: req.params.id,
                        defaultChannel: {
                          name: ch.name,
                          id: doc.logchannel
                        }})
                    } else {
                      res.render('logandignore', {channelList: objs, guildID: req.params.id})
                    }
                  })
                } else {
                  res.render('logandignore', {channelList: objs, guildID: req.params.id})
                }
              })
            } else {
              res.render('error', {message: 'You have no channels!'})
            }
          })
        } else {
          res.render('error', {message: 'You can\'t edit that server! Required permissions: Owner, Administrator, or Manage Server'})
        }
      } else {
        res.render('error', {message: 'I\'m not a member of that server!'})
      }
    })
  } else {
    res.render('error', {message: 'Invalid ID specified for log channel test!'})
  }
})

app.post('/savechannel', checkAuth, function (req, res) {
  if (!req.body.guildID) {
    console.log('WARNING: Invalid guild to be updated (logchannel) or missing ID entirely.', req.body)
    res.status(400)
  } else {
    getBotPerms('channel', req.body.channelSelector).then((perms) => {
      if (perms) {
        if (perms.readMessages || perms.sendMessages) {
        // res.status(200)
          db.updateGuild(req.body.guildID, {
            'logchannel': req.body.channelSelector
          }).then((rep) => {
            res.status(200).send('Set channel') // no need to check for other values as the promise will get rejected if something goes wrong
          }).catch((e) => {
            console.log(e)
            res.status(500).send('Internal error')
          })
        } else {
          res.status(403).send(`Bot cannot read or send messages to ${req.body.channelSelector}!`)
        }
      } else {
        res.status(400).send('Invalid channel selected')
      }
    })
  }
})

app.post('/submitmodules', checkAuth, function (req, res) {
  if (Object.keys(req.body).some((key) => allEvents.indexOf(key) === -1 && key !== 'guildID')) {
    console.log(`Malformed request when submitting modules!`, req.body)
  } else {
    let disabledEvents = allEvents.slice()
    Object.keys(req.body).filter(k => k !== 'guildID').forEach((key) => {
      disabledEvents.splice(disabledEvents.indexOf(key), 1)
    })
    db.updateGuild(req.body.guildID, {'disabledEvents': disabledEvents}).catch((e) => {
      console.log(e)
    })
  }
})

app.get('/login', passport.authenticate('discord', { scope: scopes }), function (req, res) {})
app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function (req, res) {
      superagent
      .post(Config.webhookURL)
      .send({embeds: [{
        title: 'User Logged In',
        description: `${req.user.username}#${req.user.discriminator} (${req.user.id}) logged in.`,
        timestamp: new Date(),
        color: 6918075,
        image: {
          url: req.user.avatar ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${req.user.discriminator % 5}.png`
        }
      }]})
      .end((err, res) => {
        if (err) return console.error(err)
      })
      Config.devmode === true ? res.redirect('/') : res.redirect('/dashboard/')
    })
app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/dashboard/')
})
app.get('/', function (req, res) {
  if (req.user) {
    res.render('index', {user: req.user.username})
  } else {
    res.render('index', {user: 'Anonymous'})
  }
})
app.get('/serverselector', checkAuth, function (req, res) {
  if (req.user) {
    let canEdit = []
    let userGuilds = req.user.guilds.slice()
    safeLoop(userGuilds)
    function safeLoop (guilds) { // eslint-disable-line
      if (guilds.length !== 0) {
        getUserPermsGuild(req.user.id, guilds[0].id).then((userPerms) => {
          if (userPerms) {
            if (guilds[0].owner || userPerms.administrator || userPerms.manageGuild) {
              db.guildExists(guilds[0].id).then((exist) => {
                if (exist) {
                  canEdit.push({
                    id: guilds[0].id,
                    owner: guilds[0].owner,
                    name: guilds[0].name
                  })
                  guilds.shift()
                  safeLoop(guilds)
                } else {
                  guilds.shift()
                  safeLoop(guilds)
                }
              })
            } else {
              guilds.shift()
              safeLoop(guilds)
            }
          } else {
            guilds.shift()
            safeLoop(guilds)
          }
        })
      } else {
        res.render('serverselector', {canEdit: canEdit})
      }
    }
  } else {
    res.render('error', {message: 'An unknown error has occurred while logging into the server selector.'})
  }
})

app.get('*', function (req, res) {
  res.render('error', {message: 'Page not found.'})
})

function checkAuth (req, res, next) {
  if (req.isAuthenticated()) return next()
  let redirect
  if (Config.devmode === false) {
    redirect = 'https://whatezlife.com/dashboard/callback'
  } else {
    redirect = `http://${Config.devIP}:8000/callback`
  }
  res.redirect(`https://discordapp.com/oauth2/authorize?redirect_uri=${redirect}&scope=identify%20guilds&response_type=code&client_id=311259910769999874`)
}

if (Config.devmode === false) {
  https.createServer({
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
  }, app).listen(Config.port, function (err) {
    if (err) return console.log(err)
    console.log('Logger Dashboard listening at https://whatezlife.com/dashboard/')
  })
} else {
  app.listen(Config.port, function (err) {
    if (err) return console.log(err)
    console.log('Logger Dashboard listening at http://localhost:8000')
  })
}

function getUserById (id) { // eslint-disable-line
  return new Promise((resolve, reject) => {
    let waitFor = function (message) {
      if (message.type === 'getUserReply' && message.requestedID === id) {
        resolve(JSON.parse(message.content))
        clearTimeout(timeOut)
        process.removeListener('message', waitFor)
      }
    }
    process.on('message', waitFor)
    let timeOut = setTimeout(() => {
      resolve(null)
      process.removeListener('message', waitFor)
    }, 6000)
    process.send({
      type: 'getUser',
      id: id
    })
  })
}

function getChannels (id) {
  return new Promise((resolve, reject) => {
    let waitFor = function (message) {
      if (message.type === 'getChannelsReply' && message.requestedID === id) {
        resolve(JSON.parse(message.content))
        clearTimeout(timeOut)
        process.removeListener('message', waitFor)
      }
    }
    process.on('message', waitFor)
    let timeOut = setTimeout(() => {
      resolve(null)
      process.removeListener('message', waitFor)
    }, 6000)
    process.send({
      type: 'getChannels',
      id: id
    })
  })
}

function getBotPerms (type, val) {
  return new Promise((resolve, reject) => {
    let waitFor = function (message) {
      if (message.type === 'getBotPermsReply' && message.requestedID === val) {
        resolve(JSON.parse(message.content))
        clearTimeout(timeOut)
        process.removeListener('message', waitFor)
      }
    }
    process.on('message', waitFor)
    let timeOut = setTimeout(() => {
      resolve(null)
      process.removeListener('message', waitFor)
    }, 6000)
    if (type === 'channel') {
      process.send({
        type: 'getBotPerms',
        channelID: val
      })
    } else {
      process.send({
        type: 'getBotPerms',
        guildID: val
      })
    }
  })
}

function getUserPermsGuild (userID, guildID) {
  return new Promise((resolve, reject) => {
    let waitFor = function (message) {
      if (message.type === 'getUserPermsGuildReply' && message.requestedID === userID) {
        resolve(JSON.parse(message.content))
        clearTimeout(timeOut)
        process.removeListener('message', waitFor)
      }
    }
    process.on('message', waitFor)
    let timeOut = setTimeout(() => {
      console.log('timeout removed listener')
      resolve(null)
      process.removeListener('message', waitFor)
    }, 6000)
    process.send({
      type: 'getUserPermsGuild',
      userID: userID,
      guildID: guildID
    })
  })
}

function getUserPerms (userID, type, val) {
  return new Promise((resolve, reject) => {
    let waitFor = function (message) {
      if (message.type === 'getUserPermsReply' && message.requestedID === userID) {
        resolve(JSON.parse(message.content))
        clearTimeout(timeOut)
        process.removeListener('message', waitFor)
      }
    }
    process.on('message', waitFor)
    let timeOut = setTimeout(() => {
      resolve(null)
      process.removeListener('message', waitFor)
    }, 6000)
    if (type === 'channel') {
      process.send({
        type: 'getUserPerms',
        userID: userID,
        channelID: val
      })
    } else {
      process.send({
        type: 'getUserPerms',
        userID: userID,
        guildID: val
      })
    }
  })
}

function getChannelInfo (id) {
  return new Promise((resolve, reject) => {
    let waitFor = function (message) {
      if (message.type === 'getChannelInfoReply' && message.requestedID === id) {
        resolve(JSON.parse(message.content))
        clearTimeout(timeOut)
        process.removeListener('message', waitFor)
      }
    }
    process.on('message', waitFor)
    let timeOut = setTimeout(() => {
      resolve(null)
      process.removeListener('message', waitFor)
    }, 6000)
    process.send({
      type: 'getChannelInfo',
      id: id
    })
  })
}

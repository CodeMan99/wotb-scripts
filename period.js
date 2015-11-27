#!/usr/bin/env node

var async = require('async')
  , fs = require('fs')
  , path = require('path')
  , program = require('commander')
  , wotb = require('wotblitz')

var file = path.resolve('./wotblitz-period.json')

program
  .option('-u, --username <name>', 'attempts to return win rate based on username', s => s.toLowerCase())
  .option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)
  .option('-s, --start', 'start session by saving data')
  .parse(process.argv)

program.start = program.start || !!program.username || !!program.account

async.auto({
  vehicles: (cb, d) => wotb.tankopedia.vehicles(null, [], ['name', 'nation', 'tier', 'type'], cb),
  read: (cb, d) => program.start ? cb(null, '{}') : fs.readFile(file, {encoding: 'utf8'}, cb),
  oldStats: ['read', (cb, d) => cb(null, JSON.parse(d.read))],
  sess: wotb.session.load,
  usernames: (cb, d) => program.username ? wotb.players.list(program.username, null, cb) : cb(null),
  account_id: ['sess', 'usernames', (cb, d) => {
    if (program.account)
      cb(null, program.account)
    else if (d.usernames) {
      if (d.usernames.length === 1) return cb(null, d.usernames[0].account_id)

      var player = d.usernames.find(p => p.nickname.toLowerCase() === program.username)
      if (player) return cb(null, player.account_id)

      cb(new Error('No account found for "' + program.username + '"'))
    }
    else if (d.sess.account_id)
      cb(null, d.sess.account_id)
    else
      cb(new Error('Cannot find account_id'))
  }],
  updateSession: ['account_id', 'sess', (cb, d) => {
    if (!program.username && !program.account) return cb(null)
    d.sess.account_id = d.account_id
    d.sess.save(cb)
  }],
  newStats: ['account_id', (cb, d) => wotb.tankStats.stats(
    Number(d.account_id), [], null,
    ['all.battles', 'all.losses', 'all.wins', 'last_battle_time', 'tank_id'],
    null, cb
  )],
  save: ['newStats', (cb, d) =>
    program.start ? fs.writeFile(file, JSON.stringify(d.newStats), {encoding: 'utf8'}, cb) : cb(null)
  ],
  compareGlobal: ['account_id', 'oldStats', 'newStats', (cb, d) => {
    if (program.start) return cb(null)

    var oldVal = d.oldStats[d.account_id].reduce((count, tank) => count.add(tank.all), new Count())
      , newVal = d.newStats[d.account_id].reduce((count, tank) => count.add(tank.all), new Count())

    cb(null, newVal.difference(oldVal))
  }],
  compareNations: ['account_id', 'oldStats', 'newStats', 'vehicles', compareCategories('nation')],
  compareTiers: ['account_id', 'oldStats', 'newStats', 'vehicles', compareCategories('tier')],
  compareTypes: ['account_id', 'oldStats', 'newStats', 'vehicles', compareCategories('type')],
  compareTanks: ['account_id', 'oldStats', 'newStats', 'vehicles', (cb, d) => {
    if (program.start) return cb(null)

    var tanks = d.newStats[d.account_id]
      .sort((a, b) => b.last_battle_time - a.last_battle_time)
      .map(newVal => {
        var newCnt = new Count()
          , oldCnt = new Count()
          , oldVal = d.oldStats[d.account_id].find(t => t.tank_id === newVal.tank_id)

        newCnt.name = d.vehicles[newVal.tank_id].name
        newCnt.add(newVal.all)
        if (oldVal) oldCnt.add(oldVal.all)

        return newCnt.difference(oldCnt)
      })
      .filter(count => count.battles > 0)

    cb(null, tanks)
  }]
}, (err, d) => {
  if (err) throw err

  var result = {
    global: d.compareGlobal,
    nations: d.compareNations,
    tiers: d.compareTiers,
    types: d.compareTypes,
    tanks: d.compareTanks
  }

  if (process.stdout.isTTY)
    console.dir(result, {colors: true})
  else
    console.log(JSON.stringify(result, null, 2))
})

function compareCategories(field) {
  return (cb, d) => {
    if (program.start) return cb(null)

    var createObj = (obj, tank) => {
          var key = d.vehicles[tank.tank_id][field]
          if (!(key in obj)) obj[key] = new Count()
          obj[key].add(tank.all)
          return obj
        }
      , oldVal = d.oldStats[d.account_id].reduce(createObj, {})
      , newVal = d.newStats[d.account_id].reduce(createObj, {})

    for (var k in newVal) {
      newVal[k] = newVal[k].difference(oldVal[k] || new Count())
    }

    cb(null, newVal)
  }
}

function Count() {
  this.wins = 0
  this.losses = 0
  this.battles = 0
}

Count.prototype.add = function add(other) {
  this.wins += other.wins
  this.losses += other.losses
  this.battles += other.battles
  return this
}

Count.prototype.difference = function difference(old) {
  this.wins -= old.wins
  this.losses -= old.losses
  this.battles -= old.battles
  return this
}

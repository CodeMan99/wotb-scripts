#!/usr/bin/env node

var async = require('async')
  , missing = async.asyncify(require('./missing.js'))
  , program = require('commander')
  , wotb = require('wotblitz')

program
  .option('-u, --username <name>', 'attempts to return win rate based on username', s => s.toLowerCase())
  .option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)

  .option('-p, --premium', 'diplay premium tanks')
  .option('-r, --regular', 'diplay regular tanks')

  .option('-l, --lesser <percentage>', 'display tanks with win rate less than the given value', percentageType)
  .option('-g, --greater <percentage>', 'display tanks with win rate greater than the given value', percentageType)

  .option('-t, --tiers <number>', 'display tanks from the given tiers', tiersType, [])
  .option('-T, --types <vehicletype>', 'display tanks with the given vehicle type', vehicleType, [])
  .option('-n, --nations <name>', 'display only a given nation', nationsType, [])
  .option('-s, --streak <percentage>', 'get a win streak count to reach a given percentage', percentageType)
  .parse(process.argv)

if (program.premium && program.regular) {
  console.error()
  console.error("  `--premium' and `--regular' are mutually exclusive options")
  console.error()
  process.exit(1)
}

if (program.lesser && program.greater) {
  console.error()
  console.error("  `--lesser' and `--greater' are mutually exclusive options")
  console.error()
  process.exit(1)
}

var missingFilter = program.nations.length > 0 ? {nation: program.nations} : null

async.auto({
  sess: wotb.session.load,
  vehicles: (cb, d) => wotb.tankopedia.vehicles(null, program.nations, ['is_premium', 'name', 'tier', 'type'], cb),
  all: ['vehicles', (cb, d) => missing(d.vehicles, ['is_premium', 'name', 'tier', 'type'], missingFilter, cb)],
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
  stats: ['account_id', (cb, d) =>
    wotb.tankStats.stats(
      Number(d.account_id), [], null,
      ['all.battles', 'all.losses', 'all.wins', 'tank_id'],
      null, cb
    )
  ]
}, (err, d) => {
  if (err) throw err

  var results = d.stats[d.account_id]
    .map(s => {
      var tank = d.all[s.tank_id] || {};

      return {
        drawn: (s.all.battles - s.all.wins - s.all.losses) / s.all.battles,
        lost: s.all.losses / s.all.battles,
        won: s.all.wins / s.all.battles,

        battles: s.all.battles,
        losses: s.all.losses,
        wins: s.all.wins,

        is_premium: tank.is_premium,
        name: tank.name,
        tier: tank.tier,
        type: tank.type
      }
    })
    .filter(wr => wr.name &&
      (!program.premium || wr.is_premium) &&
      (!program.regular || !wr.is_premium) &&
      (!program.lesser || wr.won < program.lesser) &&
      (!program.greater || wr.won > program.greater) &&
      (program.tiers.length === 0 || program.tiers.indexOf(wr.tier) > -1) &&
      (program.types.length === 0 || program.types.indexOf(wr.type) > -1)
    )
    .sort((a, b) => a.won - b.won)

  results.forEach(wr => {
    console.log('Name: %s  Tier: %d  Type: %s', wr.name, wr.tier, wr.type)
    console.log('    Win Rate:   %s%%', (wr.won * 100).toFixed(2))
    console.log('    Loss Rate:  %s%%', (wr.lost * 100).toFixed(2))
    console.log('    Draw Rate:  %s%%', (wr.drawn * 100).toFixed(2))

    if (program.streak) {
      console.log('    Win Streak: %d', winStreakToReach(program.streak, wr.wins, wr.battles))
    }
  })

  var overall = results.reduce((memo, wr) => {
    memo.battles += wr.battles
    memo.losses += wr.losses
    memo.wins += wr.wins
    return memo
  }, {
    battles: 0,
    losses: 0,
    wins: 0
  })

  console.log('-------- Overall --------')
  console.log('    Win Rate:  %s%%', (overall.wins / overall.battles * 100).toFixed(2))
  console.log('    Loss Rate: %s%%', (overall.losses / overall.battles * 100).toFixed(2))
  console.log('    Draw Rate: %s%%',
    ((overall.battles - overall.wins - overall.losses) / overall.battles * 100).toFixed(2)
  )

  if (program.streak) {
    console.log('    Win Streak: %d', winStreakToReach(program.streak, overall.wins, overall.battles))
  }
})

function tiersType(val, memo) {
  if (!memo) memo = []
  memo.push(Number(val))
  return memo
}

function percentageType(val) {
  return Number(val) / 100
}

function vehicleType(val, memo) {
  if (!memo) memo = []
  switch (val.toLowerCase()) {
  case 'light':
  case 'l':
    memo.push('lightTank')
    break
  case 'medium':
  case 'm':
    memo.push('mediumTank')
    break
  case 'heavy':
  case 'h':
    memo.push('heavyTank')
    break
  case 'destroyer':
  case 'td':
  case 'tank destroyer':
    memo.push('AT-SPG')
    break
  default:
    throw new Error('Unknown vehicle type')
  }

  return memo
}

function nationsType(val, memo) {
  if (!memo) memo = []
  memo.push(val.toLowerCase())
  return memo
}

function winStreakToReach(percentage, wins, battles) {
  return Math.round((percentage * battles - wins) / (1 - percentage))
}

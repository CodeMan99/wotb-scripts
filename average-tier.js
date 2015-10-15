#!/usr/bin/env node

var async = require('async')
  , program = require('commander')
  , wotb = require('wotblitz')

program
  .option('-u, --username <name>', 'attempts to return average-tier based on username', s => s.toLowerCase())
  .option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)
  .option('-p, --only-premium', 'calculate only the player\'s premium tanks')
  .option('-r, --only-regular', 'calculate only the player\'s regular tanks')
  .parse(process.argv)

if (program.onlyPremium && program.onlyRegular) {
  console.error()
  console.error("  `--only-premium' and `--only-regular' are mutually exclusive options")
  console.error()
  process.exit(1)
}

async.auto({
  sess: wotb.session.load,
  all: (callback, d) => wotb.tankopedia.vehicles([], [], ['is_premium', 'tier'], callback),
  usernames: (callback, d) => program.username ? wotb.players.list(program.username, null, callback) : callback(null),
  account_id: ['sess', 'usernames', (callback, d) => {
    if (program.account)
      callback(null, program.account)
    else if (d.usernames) {
      if (d.usernames.length === 1) return callback(null, d.usernames[0].account_id)

      var player = d.usernames.find(p => p.nickname.toLowerCase() === program.username)
      if (player) return callback(null, player.account_id)

      callback(new Error('No account found for "' + program.username + '"'))
    }
    else if (d.sess.account_id)
      callback(null, d.sess.account_id)
    else
      callback(new Error('Cannot find account_id'))
  }],
  stats: ['account_id', (callback, d) =>
    wotb.tankStats.stats(d.account_id, [], null, ['all.battles', 'tank_id'], null, callback)
  ]
}, (err, d) => {
  if (err) throw err

  var battles = d.stats[d.account_id]
      .map(t => ({
        battles: t.all.battles,
        is_premium: d.all[t.tank_id].is_premium,
        tier: d.all[t.tank_id].tier
      }))
      .filter(b => {
        if (program.onlyPremium) return b.is_premium
        if (program.onlyRegular) return !b.is_premium
        return true
      })
      .reduce((memo, val) => {
        if (!memo[val.tier]) memo[val.tier] = 0
        memo[val.tier] += val.battles
        return memo
      }, {})
    , numerator = Object.keys(battles).reduce((memo, tier) => { memo += tier * battles[tier]; return memo }, 0)
    , denominator = Object.keys(battles).reduce((memo, tier) => { memo += battles[tier]; return memo }, 0)
    , average = numerator / denominator

  console.log('Average tier: ' + average.toFixed(2))
})

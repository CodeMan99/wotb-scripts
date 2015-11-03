#!/usr/bin/env node

var async = require('async')
  , wotb = require('wotblitz')

async.auto({
  sess: wotb.session.load,
  login: ['sess', (callback, d) => d.sess.isLoggedIn() ? callback(null) : wotb.auth.login(8000, d.sess, callback)],
  stats: ['login', (callback, d) => wotb.tankStats.stats(null, [], 1, ['tank_id'], d.sess, callback)],
  garage: ['stats', (callback, d) => {
    var tankIds = d.stats[d.sess.account_id].map(s => s.tank_id)

    wotb.tankopedia.vehicles(tankIds, [], ['is_premium', 'name', 'nation', 'tier', 'type'], callback)
  }]
}, (err, d) => {
  if (err) throw err
  if (process.stdout.isTTY)
    console.dir(d.garage, {colors: true})
  else
    console.log(JSON.stringify(d.garage, null, 2))
})
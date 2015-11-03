#!/usr/bin/env node

var async = require('async')
  , wotb = require('wotblitz')

async.auto({
  sess: wotb.session.load,
  login: ['sess', (callback, d) => d.sess.isLoggedIn() ? callback(null) : wotb.auth.login(8000, d.sess, callback)],
  stats: ['login', (callback, d) => wotb.tankStats.stats(null, [], 0, ['tank_id'], d.sess, callback)],
  garage: ['stats', (callback, d) => {
    var tankIds = d.stats[d.sess.account_id].map(s => s.tank_id)

    wotb.tankopedia.vehicles(tankIds, [], ['cost', 'name'], callback)
  }]
}, (err, d) => {
  if (err) throw err

  var arr = Object.keys(d.garage)
    .map(key => ({
      cost: d.garage[key].cost.price_gold * 400 + d.garage[key].cost.price_credit,
      name: d.garage[key].name
    }))
    .sort((a, b) => a.cost - b.cost)

  if (process.stdout.isTTY)
    console.dir(arr, {colors: true})
  else
    console.log(JSON.stringify(arr, null, 2))
})

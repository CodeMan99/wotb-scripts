#!/usr/bin/env node

var async = require('async')
  , missing = async.asyncify(require('./missing.js'))
  , wotb = require('wotblitz')

async.auto({
	sess: wotb.session.load,
	vehicles: (callback, d) => wotb.tankopedia.vehicles([], [], ['name', 'nation', 'tier'], callback),
	all: ['vehicles', (callback, d) => missing(d.vehicles, ['name', 'nation', 'tier'], callback)],
	login: ['sess', (callback, d) => d.sess.isLoggedIn() ? callback(null) : wotb.auth.login(8000, d.sess, callback)],
	stats: ['sess', 'login', (callback, d) =>
		wotb.tankStats.stats(null, [], null, ['frags', 'tank_id'], d.sess, callback)
	]
}, (err, d) => {
	if (err) throw err

	var result = d.stats[d.sess.account_id]
		.map(t => ({
			name: d.all[t.tank_id].name,
			nation: d.all[t.tank_id].nation,
			tier: d.all[t.tank_id].tier,
			frags: Object.keys(t.frags)
				.sort((a, b) => t.frags[b] - t.frags[a])
				.map(id => ({
					[d.all[id].name]: t.frags[id]
				}))
		}))
		.sort((a, b) => a.tier - b.tier)

	if (process.stdout.isTTY) {
		console.dir(result, {
			colors: true,
			depth: 3
		})
	} else {
		console.log(JSON.stringify(result, null, 2))
	}
})

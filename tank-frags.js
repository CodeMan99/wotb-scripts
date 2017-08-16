#!/usr/bin/env node

var missing = require('./missing.js')
  , session = require('./lib/session.js')
  , wotblitz = require('wotblitz')()

var fields = ['name', 'nation', 'tier']

Promise.all([
	session.load().then(sess => {
		return wotblitz.tanks.stats(sess.account_id, sess.token, null, null, ['frags', 'tank_id'])
			.then(stats => stats[sess.account_id])
	}),
	wotblitz.encyclopedia.vehicles(null, null, fields).then(vehicles => missing(vehicles, fields))
]).then(([stats, vehicles]) => {
	var result = stats
		.map(tank => ({
			name: vehicles[tank.tank_id].name,
			nation: vehicles[tank.tank_id].nation,
			tier: vehicles[tank.tank_id].tier,
			frags: Object.keys(tank.frags)
				.sort((a, b) => tank.frags[b] - tank.frags[a])
				.map(id => ({[vehicles[id].name]: tank.frags[id]}))
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
}).catch(error => console.error(error.stack || error))

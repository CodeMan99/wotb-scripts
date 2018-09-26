#!/usr/bin/env node

var logger = require('./lib/logger.js').setOptions({depth: 3})
  , missing = require('./missing.js')
  , session = require('./lib/session.js')
  , wotblitz = require('wotblitz')()

var fields = ['name', 'nation', 'tier']

Promise.all([
	session.load().then(sess => {
		if (!sess.isLoggedIn()) throw new Error('tank-frags: session is not logged in')

		return wotblitz.tanks.stats(sess.account_id, sess.token, null, null, ['frags', 'tank_id'])
			.then(stats => stats[sess.account_id])
	}),
	wotblitz.encyclopedia.vehicles(null, null, fields).then(vehicles => missing(vehicles, fields))
]).then(([stats, vehicles]) => {
	return stats
		.map(tank => ({
			name: vehicles[tank.tank_id].name,
			nation: vehicles[tank.tank_id].nation,
			tier: vehicles[tank.tank_id].tier,
			frags: Object.assign({}, ...Object.keys(tank.frags)
				.sort((a, b) => tank.frags[b] - tank.frags[a])
				.map(id => ({[vehicles[id].name]: tank.frags[id]}))
			)
		}))
		.sort((a, b) => a.tier - b.tier)
}).then(logger.write, logger.error)

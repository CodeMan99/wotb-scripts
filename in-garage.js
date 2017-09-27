#!/usr/bin/env node

var logger = require('./lib/logger.js')
  , missing = require('./missing.js')
  , session = require('./lib/session.js')
  , wotblitz = require('wotblitz')()

session.load()
	.then(sess => {
		if (!sess.isLoggedIn()) throw new Error('in-garage: session is not logged in')

		return wotblitz.tanks.stats(sess.account_id, sess.token, null, '1', ['tank_id']).then(stats => {
			var tankIds = stats[sess.account_id].map(tank => tank.tank_id)
			var limit = 100
			var chunked = []
			var fields = ['is_premium', 'name', 'nation', 'tier', 'type']

			for (var i = 0; i < tankIds.length; i += limit) {
				chunked.push(wotblitz.encyclopedia.vehicles(tankIds.slice(i, i + limit), null, fields))
			}

			return Promise.all(chunked)
				.then(chunkedVehicles => Object.assign(...chunkedVehicles))
				.then(vehicles => missing(vehicles, fields, (_, id) => tankIds.indexOf(+id) > -1))
		})
	})
	.then(logger.write, logger.error)

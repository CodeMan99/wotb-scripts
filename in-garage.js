#!/usr/bin/env node

var async = require('async'), missing = async.asyncify(require('./missing.js')), wotb = require('wotblitz')

async.auto({
	sess: wotb.session.load,
	login: ['sess', (callback, d) => d.sess.isLoggedIn() ? callback(null) : wotb.auth.login(8000, d.sess, callback)],
	stats: ['login', (callback, d) => wotb.tankStats.stats(null, [], 1, ['tank_id'], d.sess, callback)],
	missing: (callback, d) => missing({}, ['is_premium', 'name', 'nation', 'tier', 'type'], callback),
	garage: ['missing', 'stats', (callback, d) => {
		var tankIds = d.stats[d.sess.account_id].map(s => s.tank_id),
			chunked = [],
			limit = 100,
			vehiclesPartial = (tankIdsChunk, cb) => {
				var include = []
				for (var k in d.missing) {
					var i = tankIdsChunk.indexOf(Number(k))
					if (i > -1) {
						include.push(k)
						tankIdsChunk.splice(i, 1)
					}
				}
				wotb.tankopedia.vehicles(tankIdsChunk, [], ['is_premium', 'name', 'nation', 'tier', 'type'], (err, v) => {
					if (err) return cb(err)
					include.forEach(k => v[k] = d.missing[k])
					cb(null, v)
				})
			}

		if (tankIds.length <= limit) return vehiclesPartial(tankIds, callback)

		for (var i = 0; i < tankIds.length; i += limit) {
			chunked.push(tankIds.slice(i, i + limit))
		}

		async.map(chunked, vehiclesPartial, (err, chunkedData) => {
			if (err) return callback(err)
			callback(null, Object.assign.apply(null, chunkedData))
		})
	}]
}, (err, d) => {
	if (err) throw err
	if (process.stdout.isTTY)
		console.dir(d.garage, {
			colors: true
		})
	else
		console.log(JSON.stringify(d.garage, null, 2))
})

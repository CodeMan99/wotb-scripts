#!/usr/bin/env node

var async = require('async')
  , missing = async.asyncify(require('./missing.js'))
  , program = require('commander')
  , wotb = require('wotblitz')

program
	.option('-c, --count <number>', 'number of vehicles to return', Number, 5)
	.option('-t, --tiers <number>', 'filter to kills to this tier', numbersType, [])
	.option(
		'-m, --mode <most|least|none>',
		'get your most kills, least kills, or never killed [default: most]',
		modeType,
		'most'
	)
	.parse(process.argv)

async.auto({
	sess: wotb.session.load,
	_all: callback => wotb.tankopedia.vehicles([], [], ['tier'], callback),
	all: ['_all', (callback, d) => missing(d._all, ['tier'], callback)],
	login: ['sess', (callback, d) => d.sess.isLoggedIn() ? callback(null) : wotb.auth.login(8000, d.sess, callback)],
	stats: ['login', (callback, d) => wotb.players.info(null, [], ['statistics.frags'], d.sess, callback)],
	frags: ['all', 'stats', (callback, d) => {
		var frags = d.stats[d.sess.account_id].statistics.frags,
			tierFilter = id => program.tiers.length === 0 || program.tiers.indexOf(d.all[id].tier) > -1,
			ret

		switch (program.mode) {
		case 'most':
			ret = Object.keys(frags).filter(tierFilter).sort((a, b) => frags[b] - frags[a])
			break
		case 'least':
			ret = Object.keys(frags).filter(tierFilter).sort((a, b) => frags[a] - frags[b])
			break
		case 'none':
			ret = Object.keys(d.all).filter(id => !(id in frags) && tierFilter(id))
			break
		}

		callback(null,
			// not entirely sure 'count' makes sense for 'none' mode
			ret.slice(0, program.count).map(id => ({
				tank_id: id,
				frags: frags[id] || 0
			}))
		)
	}],
	_missing: callback => missing({}, ['nation', 'name', 'tier'], callback),
	vehicles: ['frags', '_missing', (callback, d) => {
		var tankIds = d.frags.map(f => f.tank_id)

		// remove missing tanks if they are not in the "d.frags" array
		Object.keys(d._missing).forEach(id => {
			if (tankIds.indexOf(id) === -1) delete d._missing[id]
		})

		wotb.tankopedia.vehicles(tankIds, [], ['nation', 'name', 'tier'], (err, tanks) => {
			if (err) return callback(err)

			callback(null, Object.assign(tanks, d._missing))
		})
	}]
}, (err, d) => {
	if (err) throw err

	var result = d.frags.map(f => {
		var vehicle = d.vehicles[f.tank_id] || f
		vehicle.frags = f.frags
		return vehicle
	})

	if (process.stdout.isTTY)
		console.dir(result, {
			colors: true
		})
	else
		console.log(JSON.stringify(result, null, 2))
})

function numbersType(val, memo) {
	memo.push(Number(val))
	return memo
}

function modeType(val) {
	val = val.toLowerCase().trim()
	switch (val) {
	case 'most':
	case 'least':
	case 'none':
		return val
	default:
		throw new Error('Invalid mode')
	}
}

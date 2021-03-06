#!/usr/bin/env node

var logger = require('./lib/logger.js')
  , missing = require('./lib/missing.js')
  , program = require('commander')
  , types = require('./lib/types.js')
  , session = require('./lib/session.js')
  , wotblitz = require('wotblitz')()

program
	.option('-c, --count <number>', 'number of vehicles to return', Number, 5)
	.option('-t, --tiers <number>', 'filter to kills to this tier', types.numbers, [])
	.option(
		'-m, --mode <most|least|none>',
		'get your most kills, least kills, or never killed [default: most]',
		modeType,
		'most'
	)
	.parse(process.argv)

session.load().then(sess => {
	if (!sess.isLoggedIn()) throw new Error('frags: session is not logged in')

	return Promise.all([
		sess,
		wotblitz.encyclopedia.vehicles(null, null, ['tier']).then(vehicles => missing(vehicles, ['tier'])),
		wotblitz.account.info(sess.account_id, sess.token, null, ['statistics.frags'])
	])
}).then(([sess, vehicles, info]) => {
	var frags = info[sess.account_id].statistics.frags
	var tierFilter = id => program.tiers.length === 0 || program.tiers.indexOf(vehicles[id].tier) > -1
	var fields
	var tankIds

	switch (program.mode) {
	case 'most':
		tankIds = Object.keys(frags).filter(tierFilter).sort((a, b) => frags[b] - frags[a])
		break
	case 'least':
		tankIds = Object.keys(frags).filter(tierFilter).sort((a, b) => frags[a] - frags[b])
		break
	case 'none':
		tankIds = Object.keys(vehicles).filter(id => !(id in frags) && tierFilter(id))
		break
	}

	tankIds = tankIds.slice(0, program.count)
	fields = ['nation', 'name', 'tier']

	return wotblitz.encyclopedia.vehicles(tankIds, null, fields).then(tanks => {
		tanks = missing(tanks, fields, (_, id) => tankIds.indexOf(id) > -1)

		return tankIds.map(id => Object.assign(tanks[id], {frags: frags[id] || 0}))
	})
}).then(logger.write, logger.error)

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

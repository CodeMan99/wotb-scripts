#!/usr/bin/env node

var findAccount = require('./lib/findAccount.js')
var logger = require('./lib/logger.js')
var missing = require('./missing.js')
var program = require('commander')
var session = require('./lib/session.js')
var wotblitz = require('wotblitz')()

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
	process.exitCode = 1
	return
}

var account_id_p = null

if (program.account) {
	account_id_p = Promise.resolve(program.account)
} else if (program.username) {
	account_id_p = findAccount(program.username).then(player => player.account_id)
} else {
	account_id_p = session.load().then(sess => sess.account_id)
}

account_id_p.then(account_id => {
	var fields = ['is_premium', 'tier']

	return Promise.all([
		wotblitz.encyclopedia.vehicles(null, null, fields).then(vehicles => missing(vehicles, fields)),
		wotblitz.tanks.stats(account_id, null, null, null, ['all.battles', 'tank_id']).then(stats => stats[account_id])
	])
}).then(([vehicles, stats]) => {
	var is_premium, counter = new Array(10).fill(0)
	var numerator = 0, denominator = 0

	for (var {all, tank_id} of stats) {
		is_premium = vehicles[tank_id].is_premium

		if (program.onlyPremium && is_premium == false) continue
		if (program.onlyRegular && is_premium == true) continue

		counter[vehicles[tank_id].tier - 1] += all.battles
	}

	for (var [index, battles] of counter.entries()) {
		numerator += (index + 1) * battles
		denominator += battles
	}

	logger.write({
		'Average tier': (numerator / denominator).toFixed(4),
		datetime: new Date()
	})
}).catch(logger.error)

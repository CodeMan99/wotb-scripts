#!/usr/bin/env node

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

Promise.all([
	session.load(),
	program.username ? wotblitz.account.list(program.username) : null
]).then(([sess, usernames]) => {
	if (program.account)
		return program.account
	else if (usernames) {
		if (usernames.length === 1) return usernames[0].account_id

		var player = usernames.find(p => p.nickname.toLowerCase() === program.username)
		if (player) return player.account_id

		throw new Error('No account found for "' + program.username + '"')
	} else if (sess.account_id)
		return sess.account_id
	else
		throw new Error('Cannot find account_id')
}).then(account_id => {
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

#!/usr/bin/env node

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
	var battles = stats
		.map(({all, tank_id}) => ({
			battles: all.battles,
			is_premium: vehicles[tank_id].is_premium,
			tier: vehicles[tank_id].tier
		}))
		.filter(b => {
			if (program.onlyPremium) return b.is_premium
			if (program.onlyRegular) return !b.is_premium
			return true
		})
		.reduce((memo, val) => {
			if (!memo[val.tier]) memo[val.tier] = 0
			memo[val.tier] += val.battles
			return memo
		}, {})
	var numerator = Object.keys(battles).reduce((memo, tier) => memo + tier * battles[tier], 0)
	var denominator = Object.keys(battles).reduce((memo, tier) => memo + battles[tier], 0)
	var average = numerator / denominator

	console.log('Average tier: ' + average.toFixed(4))
}).catch(error => console.error(error.stack || error))

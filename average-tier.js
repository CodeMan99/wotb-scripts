#!/usr/bin/env node

var async = require('async');
var missing = async.asyncify(require('./missing.js'));
var program = require('commander');
var wotb = require('wotblitz');

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
	process.exit(1)
}

var getAccountId = async.asyncify((sess, usernames) => {
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
})

async.auto({
	sess: wotb.session.load,
	vehicles: (callback, d) => wotb.tankopedia.vehicles([], [], ['is_premium', 'tier'], callback),
	all: ['vehicles', (callback, d) => missing(d.vehicles, ['is_premium', 'tier'], callback)],
	usernames: (callback, d) => program.username ? wotb.players.list(program.username, null, callback) : callback(null),
	account_id: ['sess', 'usernames', (callback, d) => getAccountId(d.sess, d.usernames, callback)],
	stats: ['account_id', (callback, d) =>
		wotb.tankStats.stats(Number(d.account_id), [], null, ['all.battles', 'tank_id'], null, callback)
	]
}, (err, d) => {
	if (err) throw err

	var battles = d.stats[d.account_id]
		.map(t => ({
			battles: t.all.battles,
			is_premium: d.all[t.tank_id].is_premium,
			tier: d.all[t.tank_id].tier
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
		}, {}),
		numerator = Object.keys(battles).reduce((memo, tier) => {
			memo += tier * battles[tier];
			return memo
		}, 0),
		denominator = Object.keys(battles).reduce((memo, tier) => {
			memo += battles[tier];
			return memo
		}, 0),
		average = numerator / denominator

	console.log('Average tier: ' + average.toFixed(4))
})

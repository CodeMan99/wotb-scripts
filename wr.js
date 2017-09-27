#!/usr/bin/env node

var logger = require('./lib/logger.js')
  , missing = require('./missing.js')
  , program = require('commander')
  , session = require('./lib/session.js')
  , types = require('./lib/types.js')
  , wotblitz = require('wotblitz')()

program
	.option('-u, --username <name>', 'attempts to return win rate based on username', s => s.toLowerCase())
	.option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)

	.option('-p, --premium', 'diplay premium tanks')
	.option('-r, --regular', 'diplay regular tanks')

	.option('-l, --lesser <percentage>', 'display tanks with win rate less than the given value', percentageType)
	.option('-g, --greater <percentage>', 'display tanks with win rate greater than the given value', percentageType)

	.option('-t, --tiers <number>', 'display tanks from the given tiers', types.numbers, [])
	.option('-T, --types <vehicletype>', 'display tanks with the given vehicle type', vehicleType, [])
	.option('-n, --nations <name>', 'display only a given nation', nationsType, [])
	.option('-s, --streak <percentage>', 'get a win streak count to reach a given percentage', percentageType)
	.parse(process.argv)

if (program.premium && program.regular) {
	console.error()
	console.error("  `--premium' and `--regular' are mutually exclusive options")
	console.error()
	process.exit(1)
}

if (program.lesser && program.greater) {
	console.error()
	console.error("  `--lesser' and `--greater' are mutually exclusive options")
	console.error()
	process.exit(1)
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
	var fields = ['is_premium', 'name', 'tier', 'type']
	var filter = program.nations.length > 0 ? ({nation}) => { return program.nations.indexOf(nation) > -1 } : null

	return Promise.all([
		wotblitz.encyclopedia.vehicles(null, program.nations, fields)
			.then(vehicles => missing(vehicles, fields, filter)),
		wotblitz.tanks.stats(account_id, null, null, null, ['all.battles', 'all.losses', 'all.wins', 'tank_id'])
			.then(stats => stats[account_id])
	])
}).then(([vehicles, stats]) => {
	var results = stats
		.map(({tank_id: id, all}) => {
			var tank = vehicles[id] || {};

			return {
				drawn: (all.battles - all.wins - all.losses) / all.battles,
				lost: all.losses / all.battles,
				won: all.wins / all.battles,

				battles: all.battles,
				losses: all.losses,
				wins: all.wins,

				is_premium: tank.is_premium,
				name: tank.name,
				tier: tank.tier,
				type: tank.type
			}
		})
		.filter(wr => wr.name &&
			(!program.premium || wr.is_premium) &&
			(!program.regular || !wr.is_premium) &&
			(!program.lesser || wr.won < program.lesser) &&
			(!program.greater || wr.won > program.greater) &&
			(program.tiers.length === 0 || program.tiers.indexOf(wr.tier) > -1) &&
			(program.types.length === 0 || program.types.indexOf(wr.type) > -1)
		)
		.sort((a, b) => a.won - b.won)

	results.forEach(wr => {
		console.log('Name: %s  Tier: %d  Type: %s', wr.name, wr.tier, wr.type)
		console.log('    Win Rate:   %s%%', (wr.won * 100).toFixed(2))
		console.log('    Loss Rate:  %s%%', (wr.lost * 100).toFixed(2))
		console.log('    Draw Rate:  %s%%', (wr.drawn * 100).toFixed(2))

		if (program.streak) {
			console.log('    Win Streak: %d', winStreakToReach(program.streak, wr.wins, wr.battles))
		}
	})

	var overall = results.reduce((memo, wr) => {
		memo.battles += wr.battles
		memo.losses += wr.losses
		memo.wins += wr.wins
		return memo
	}, {
		battles: 0,
		losses: 0,
		wins: 0
	})

	console.log('-------- Overall --------')
	console.log('    Win Rate:  %s%%', (overall.wins / overall.battles * 100).toFixed(2))
	console.log('    Loss Rate: %s%%', (overall.losses / overall.battles * 100).toFixed(2))
	console.log('    Draw Rate: %s%%',
		((overall.battles - overall.wins - overall.losses) / overall.battles * 100).toFixed(2)
	)

	if (program.streak) {
		console.log('    Win Streak: %d', winStreakToReach(program.streak, overall.wins, overall.battles))
	}
}).catch(logger.error)

function percentageType(val) {
	return Number(val) / 100
}

function vehicleType(val, memo) {
	if (!memo) memo = []
	switch (val.toLowerCase()) {
	case 'light':
	case 'l':
		memo.push('lightTank')
		break
	case 'medium':
	case 'm':
		memo.push('mediumTank')
		break
	case 'heavy':
	case 'h':
		memo.push('heavyTank')
		break
	case 'destroyer':
	case 'td':
	case 'tank destroyer':
		memo.push('AT-SPG')
		break
	default:
		throw new Error('Unknown vehicle type')
	}

	return memo
}

function nationsType(val, memo) {
	if (!memo) memo = []
	memo.push(val.toLowerCase())
	return memo
}

function winStreakToReach(percentage, wins, battles) {
	return Math.round((percentage * battles - wins) / (1 - percentage))
}

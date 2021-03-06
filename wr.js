#!/usr/bin/env node

var Count = require('./lib/count.js')
  , findAccount = require('./lib/findAccount.js')
  , logger = require('./lib/logger.js')
  , missing = require('./lib/missing.js')
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

var account_id_p = null

if (program.account) {
	account_id_p = Promise.resolve({account_id: program.account})
} else if (program.username) {
	account_id_p = findAccount(program.username)
} else {
	account_id_p = session.load()
}

account_id_p.then(({account_id}) => {
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
			var tank = vehicles[id] || {}
			var {wins, losses, battles} = all

			return {
				drawn: (battles - wins - losses) / battles,
				lost: losses / battles,
				won: wins / battles,

				battles: battles,
				losses: losses,
				wins: wins,

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

	var overall = new Count()

	for (var wr of results) {
		console.log('Name: %s  Tier: %d  Type: %s', wr.name, wr.tier, wr.type)
		console.log('    Win Rate:   %s%%', (wr.won * 100).toFixed(2))
		console.log('    Loss Rate:  %s%%', (wr.lost * 100).toFixed(2))
		console.log('    Draw Rate:  %s%%', (wr.drawn * 100).toFixed(2))

		if (program.streak) {
			console.log('    Win Streak: %d', winStreakToReach(program.streak, wr))
		}

		overall.add(wr)
	}

	console.log('-------- Overall --------')
	console.log('    Win Rate:  %s%%', (overall.wins / overall.battles * 100).toFixed(2))
	console.log('    Loss Rate: %s%%', (overall.losses / overall.battles * 100).toFixed(2))
	console.log('    Draw Rate: %s%%',
		((overall.battles - overall.wins - overall.losses) / overall.battles * 100).toFixed(2)
	)

	if (program.streak) {
		console.log('    Win Streak: %d', winStreakToReach(program.streak, overall))
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

function winStreakToReach(percentage, {wins, battles}) {
	return Math.round((percentage * battles - wins) / (1 - percentage))
}

#!/usr/bin/env node

var Count = require('./lib/count.js')
  , findAccount = require('./lib/findAccount.js')
  , fs = require('fs')
  , logger = require('./lib/logger.js')
  , missing = require('./missing.js')
  , path = require('path')
  , program = require('commander')
  , session = require('./lib/session.js')
  , util = require('util')
  , wotblitz = require('wotblitz')()

program
	.option('-u, --username <name>', 'attempts to return win rate based on username', s => s.toLowerCase())
	.option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)
	.option('-s, --start', 'start session by saving data')
	.parse(process.argv)

program.start = program.start || !!program.username || !!program.account

var file = path.resolve('./wotblitz-period.json')
var readFile = util.promisify(fs.readFile)
var writeFile = util.promisify(fs.writeFile)

var sess_p = session.load()
var account_id_p = null
var updateSessionAccountId = false

if (program.account) {
	updateSessionAccountId = true
	account_id_p = Promise.resolve(program.account)
} else if (program.username) {
	updateSessionAccountId = true
	account_id_p = findAccount(program.username).then(player => player.account_id)
} else {
	account_id_p = sess_p.then(sess => sess.account_id)
}

var currentStats_p = account_id_p.then(account_id => wotblitz.tanks.stats(account_id, null, null, null, [
	'all.battles',
	'all.losses',
	'all.wins',
	'last_battle_time',
	'tank_id'
]))

if (program.start) {
	var writeStats_p = currentStats_p.then(stats => writeFile(file, JSON.stringify(stats), 'utf8'))
	var updateSession_p = null

	if (updateSessionAccountId) {
		updateSession_p = Promise.all([account_id_p, sess_p]).then(([account_id, sess]) => {
			sess.account_id = account_id
			return sess.save()
		})
	}

	Promise.all([writeStats_p, updateSession_p])
		.then(() => console.log('Success: started new session.'))
		.catch(logger.error)
} else {
	var fields = ['name', 'nation', 'tier', 'type']

	Promise.all([
		wotblitz.encyclopedia.vehicles(null, null, fields).then(vehicles => missing(vehicles, fields)),
		readFile(file, 'utf8').then(data => JSON.parse(data)),
		currentStats_p,
		account_id_p
	]).then(([vehicles, _previousStats, _currentStats, account_id]) => {
		var previousStats = _previousStats[account_id]
		var currentStats = _currentStats[account_id]

		var compareCategories = field => {
			var createCounts = (counts, {all, tank_id}) => {
				var key = vehicles[tank_id][field]
				if (!(key in counts)) counts[key] = new Count()
				counts[key].add(all)
				return counts
			}
			var previousTotal = previousStats.reduce(createCounts, {})
			var currentTotal = currentStats.reduce(createCounts, {})

			for (var k in currentTotal) {
				currentTotal[k] = currentTotal[k].difference(previousTotal[k] || new Count())
			}

			return currentTotal
		}

		var previousGlobal = previousStats.reduce((count, tank) => count.add(tank.all), new Count())
		var currentGlobal = currentStats.reduce((count, tank) => count.add(tank.all), new Count())

		var result = {
			global: currentGlobal.difference(previousGlobal),
			nations: compareCategories('nation'),
			tiers: compareCategories('tier'),
			types: compareCategories('type')
		};

		result.tanks = currentStats
			.sort((a, b) => b.last_battle_time - a.last_battle_time)
			.map(({all, tank_id}) => {
				var previousCount = new Count();
				var currentCount = new Count();
				var previous = previousStats.find(t => t.tank_id === tank_id)

				currentCount.add(all)
				if (previous) previousCount.add(previous.all)

				return {tank_id: tank_id, count: currentCount.difference(previousCount)}
			})
			.filter(record => record.count.battles > 0)
			.reduce((tanks, record) => {
				var name = vehicles[record.tank_id].name

				tanks[name] = record.count

				return tanks
			}, {})

		return result
	}).then(logger.write, logger.error)
}

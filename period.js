#!/usr/bin/env node

var fs = require('fs')
  , logger = require('./lib/logger.js')()
  , missing = require('./missing.js')
  , path = require('path')
  , pify = require('pify')
  , program = require('commander')
  , session = require('./lib/session.js')
  , wotblitz = require('wotblitz')()

program
	.option('-u, --username <name>', 'attempts to return win rate based on username', s => s.toLowerCase())
	.option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)
	.option('-s, --start', 'start session by saving data')
	.parse(process.argv)

program.start = program.start || !!program.username || !!program.account

var file = path.resolve('./wotblitz-period.json')
var readFile = pify(fs.readFile)
var writeFile = pify(fs.writeFile)

var usernames_p = program.username ? wotblitz.players.list(program.username) : null
var sess_p = session.load()
var account_id_p = Promise.all([sess_p, usernames_p]).then(([sess, usernames]) => {
	if (program.account)
		return program.account
	else if (usernames) {
		if (usernames.length === 1) return usernames[0].account_id

		var player = usernames.find(p => p.nickname.toLowerCase() === program.username)
		if (player) return player.account_id

		throw new Error(`No account found for "${program.username}"`)
	} else if (sess.account_id)
		return sess.account_id
	else
		throw new Error('Cannot find account_id')
})
var newStats_p = account_id_p.then(account_id => wotblitz.tanks.stats(account_id, null, null, null, [
	'all.battles',
	'all.losses',
	'all.wins',
	'last_battle_time',
	'tank_id'
]))

if (program.start) {
	var updateSession = program.username || program.account ? Promise.all([account_id_p, sess_p]).then(([account_id, sess]) => {
		sess.account_id = account_id
		return sess.save()
	}) : null

	Promise.all([
		newStats_p.then(stats => writeFile(file, JSON.stringify(stats), 'utf8')),
		updateSession
	])
		.then(() => console.log('Success: started new session.'))
		.catch(logger.error)
} else {
	var fields = ['name', 'nation', 'tier', 'type']

	Promise.all([
		wotblitz.encyclopedia.vehicles(null, null, fields).then(vehicles => missing(vehicles, fields)),
		readFile(file, 'utf8').then(data => JSON.parse(data)),
		newStats_p,
		account_id_p
	]).then(([vehicles, oldstats, newstats, account_id]) => {
		var oldStats = oldstats[account_id];
		var newStats = newstats[account_id];

		var compareCategories = field => {
			var createCounts = (counts, {all, tank_id}) => {
				var key = vehicles[tank_id][field]
				if (!(key in counts)) counts[key] = new Count()
				counts[key].add(all)
				return counts
			}
			var oldVal = oldStats.reduce(createCounts, {})
			var newVal = newStats.reduce(createCounts, {})

			for (var k in newVal) {
				newVal[k] = newVal[k].difference(oldVal[k] || new Count())
			}

			return newVal
		}

		var oldGlobal = oldStats.reduce((count, tank) => count.add(tank.all), new Count())
		var newGlobal = newStats.reduce((count, tank) => count.add(tank.all), new Count())

		var result = {
			global: newGlobal.difference(oldGlobal),
			nations: compareCategories('nation'),
			tiers: compareCategories('tier'),
			types: compareCategories('type')
		};

		result.tanks = newStats
			.sort((a, b) => b.last_battle_time - a.last_battle_time)
			.map(({all, tank_id}) => {
				var oldCnt = new Count();
				var newCnt = new Count();
				var previous = oldStats.find(t => t.tank_id === tank_id)

				newCnt.name = vehicles[tank_id].name
				newCnt.add(all)
				if (previous) oldCnt.add(previous.all)

				return newCnt.difference(oldCnt)
			})
			.filter(count => count.battles > 0)

		return result
	}).then(logger.write, logger.error)
}

function Count() {
	this.wins = 0
	this.losses = 0
	this.battles = 0
}

Count.prototype.add = function add(other) {
	this.wins += other.wins
	this.losses += other.losses
	this.battles += other.battles
	return this
}

Count.prototype.difference = function difference(old) {
	this.wins -= old.wins
	this.losses -= old.losses
	this.battles -= old.battles
	return this
}

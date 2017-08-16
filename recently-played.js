#!/usr/bin/env node

var async = require('async')
  , fs = require('fs')
  , http = require('http')
  , path = require('path')
  , program = require('commander')
  , Stream = require('stream').Transform
  , url = require('url')
  , wotb = require('wotblitz')

program
	.option('-u, --username <name>', 'attempts to return average-tier based on username', s => s.toLowerCase())
	.option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)
	.option('-c, --count <number>', 'number of recent vehicles to return [default: 5]', Number, 5)
	.option('-s, --save-images <directory>', 'save images to the given directory', directoryType)
	.parse(process.argv)

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
	usernames: (callback, d) => program.username ? wotb.players.list(program.username, null, callback) : callback(null),
	account_id: ['sess', 'usernames', (callback, d) => getAccountId(d.sess, d.usernames, callback)],
	stats: ['account_id', (callback, d) =>
		wotb.tankStats.stats(Number(d.account_id), [], null, ['last_battle_time', 'tank_id'], null, callback)
	],
	recent: ['stats', (callback, d) =>
		callback(null, d.stats[d.account_id]
			.sort((a, b) => b.last_battle_time - a.last_battle_time)
			.slice(0, program.count)
		)
	],
	vehicles: ['recent', (callback, d) =>
		wotb.tankopedia.vehicles(d.recent.map(r => r.tank_id), [], ['images.preview', 'name'], callback)
	],
	images: ['vehicles', (callback, d) => {
		if (!program.saveImages) return callback(null)
		async.map(d.vehicles, image.bind(null, program.saveImages), callback)
	}]
}, (err, d) => {
	if (err) throw err

	var vehicles = d.recent.map(r => ({
		image: d.vehicles[r.tank_id].images.preview,
		last_battle_time: new Date(r.last_battle_time * 1000),
		name: d.vehicles[r.tank_id].name
	}))

	if (process.stdout.isTTY)
		console.dir(vehicles, {
			colors: true
		})
	else
		console.log(JSON.stringify(vehicles, null, 2))
})

function image(directory, vehicle, callback) {
	var imgUrl = vehicle.images.preview,
		filepath = path.join(directory,
			url.parse(imgUrl)
			.pathname
			.split('/')
			.slice(-1)[0]
		)

	http.get(imgUrl, response => {
		var data = new Stream()

		response.on('data', chunk => data.push(chunk))
		response.on('end', () => {
			data.pipe(fs.createWriteStream(filepath))
			callback(null)
		})
	}).once('error', callback)
}

function directoryType(val) {
	var dir = path.resolve(val)

	if (fs.statSync(dir).isDirectory()) return dir

	throw new Error('value must be a directory')
}

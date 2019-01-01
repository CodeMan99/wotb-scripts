#!/usr/bin/env node

var fetch = require('node-fetch')
  , findAccount = require('./lib/findAccount.js')
  , fs = require('fs')
  , logger = require('./lib/logger.js')
  , missing = require('./lib/missing.js')
  , path = require('path')
  , program = require('commander')
  , promisepipe = require('promisepipe')
  , session = require('./lib/session.js')
  , url = require('url')
  , wotblitz = require('wotblitz')()

program
	.option('-u, --username <name>', 'attempts to return average-tier based on username', s => s.toLowerCase())
	.option('-a, --account <account_id>', 'blitz account_id to calculate; otherwise uses the session value', Number)
	.option('-c, --count <number>', 'number of recent vehicles to return [default: 5]', Number, 5)
	.option('-s, --save-images <directory>', 'save images to the given directory', directoryType)
	.parse(process.argv)

var account_id_p = null

if (program.account) {
	account_id_p = Promise.resolve({account_id: program.account})
} else if (program.username) {
	account_id_p = findAccount(program.username)
} else {
	account_id_p = session.load()
}

account_id_p.then(({account_id}) => {
	return wotblitz.tanks.stats(account_id, null, null, null, ['last_battle_time', 'tank_id']).then(stats => stats[account_id])
}).then(stats => {
	var recent = stats.sort((a, b) => b.last_battle_time - a.last_battle_time).slice(0, program.count)
	var tank_id = recent.map(stat => stat.tank_id);
	var _p_vehicles = wotblitz.encyclopedia.vehicles(tank_id, null, ['images.preview', 'name'])

	return Promise.all([
		_p_vehicles.then(vehicles => missing(vehicles, ['name'], (_, id) => tank_id.indexOf(+id) > -1)),
		recent,
		program.saveImages && _p_vehicles.then(vehicles => {
			return Promise.all(Object.entries(vehicles).map(([tank_id, vehicle]) => {
				return image(vehicle).then(file => ({file, tank_id}))
			})).then(images => {
				var result = {}

				for (var img of images) {
					result[img.tank_id] = img.file
				}

				return result
			})
		})
	])
}).then(([vehicles, stats, images]) => {
	return stats.map(({last_battle_time: time, tank_id: id}) => ({
		image: images && images[id] || (() => { try { return vehicles[id].images.preview; } catch (e) {} return 'EISEMPTY'; })(),
		last_battle_time: new Date(time * 1000),
		name: vehicles[id].name
	}))
}).then(logger.write, logger.error)

function image(vehicle) {
	if (!program.saveImages) return Promise.resolve(null)
	if (!vehicle.images || !vehicle.images.preview) return Promise.resolve(null)

	var imgUrl = vehicle.images.preview
	var directory = program.saveImages
	var filepath = path.join(directory, url.parse(imgUrl).pathname.split('/').pop())

	return fetch(imgUrl)
		.then(response => promisepipe(response.body, fs.createWriteStream(filepath)))
		.then(() => {
			var cwd = process.cwd()

			return filepath.startsWith(cwd) ? path.relative(cwd, filepath) : filepath
		})
}

function directoryType(val) {
	var dir = path.resolve(val)

	if (fs.statSync(dir).isDirectory()) return dir

	throw new Error('value must be a directory')
}

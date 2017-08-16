#!/usr/bin/env node

var logger = require('./lib/logger.js')();
var wotblitz = require('wotblitz')();
var program = require('commander');

program
	.option('-a, --account <account_id>', 'WarGaming assigned account_id', Number)
	.parse(process.argv);

if (!program.account) {
	console.error('max-xp: no account_id provided');
	process.exitCode = 1;
	return;
}

wotblitz.tanks.stats(program.account, null, null, null, ['tank_id', 'all.max_xp'])
	.then(data => data[program.account])
	.then(stats => stats.sort((a, b) => b.all.max_xp - a.all.max_xp).slice(0, 10))
	.then(top10 => {
		return wotblitz.encyclopedia.vehicles(top10.map(x => x.tank_id), null, ['name', 'tier', 'nation'])
			.then(vehicles => top10.map(x => Object.assign(x.all, vehicles[x.tank_id])))
	})
	.then(logger.write, logger.error);

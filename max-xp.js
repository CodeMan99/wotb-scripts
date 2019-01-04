#!/usr/bin/env node

/**
 * Example usage with prolongate call
 *
 * ./max-xp.js -a $(npm run prolongate | sed '/^>\s/ d' | json account_id)
 */

var logger = require('./lib/logger.js');
var wotblitz = require('wotblitz')();
var program = require('commander');
var session = require('./lib/session.js');
var findAccount = require('./lib/findAccount.js');

program
	.option('-a, --account <account_id>', 'WarGaming assigned account_id', Number)
	.option('-u, --username <username>', 'WarGaming account nickname')
	.parse(process.argv);

var account_id_p = null

if (program.account) {
	account_id_p = Promise.resolve({account_id: program.account});
} else if (program.username) {
	account_id_p = findAccount(program.username);
} else {
	account_id_p = session.load();
}

account_id_p
	.then(({account_id}) => {
		return wotblitz.tanks.stats(account_id, null, null, null, ['tank_id', 'all.max_xp'])
			.then(data => data[account_id])
	})
	.then(stats => stats.sort((a, b) => b.all.max_xp - a.all.max_xp).slice(0, 10))
	.then(top10 => {
		return wotblitz.encyclopedia.vehicles(top10.map(x => x.tank_id), null, ['name', 'tier', 'nation'])
			.then(vehicles => top10.map(x => Object.assign(x.all, vehicles[x.tank_id])))
	})
	.then(logger.write, logger.error);

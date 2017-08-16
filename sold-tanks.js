#!/usr/bin/env node

var os = require('os');
var path = require('path');
var session = require(path.join(os.homedir(), '.wotblitz.json'));
var wotblitz = require('wotblitz')();

wotblitz.tanks.stats(session.auth.account_id, session.auth.access_token, null, '0', 'tank_id').then(stats => {
	var tank_id = stats[session.auth.account_id].map(s => s.tank_id);

	return wotblitz.encyclopedia.vehicles(tank_id, null, ['cost', 'name']);
}).then(sold => {
	var arr = Object.keys(sold)
		.filter(key => sold[key]) // skip missing tanks
		.map(key => ({
			cost: sold[key].cost.price_gold * 400 + sold[key].cost.price_credit,
			name: sold[key].name
		}))
		.sort((a, b) => a.cost - b.cost);

	if (process.stdout.isTTY) {
		console.dir(arr, {colors: true});
	} else {
		console.log(JSON.stringify(arr, null, 2));
	}
}).catch(error => {
	console.error(error.stack);
})

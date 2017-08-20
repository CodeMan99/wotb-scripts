#!/usr/bin/env node

var logger = require('./lib/logger.js')();
var os = require('os');
var path = require('path');
var session = require('./lib/session.js');
var wotblitz = require('wotblitz')();

session.load().then(sess => {
	if (!sess.isLoggedIn()) throw new Error('sold-tanks: session is not logged in');

	return wotblitz.tanks.stats(sess.account_id, sess.token, null, '0', 'tank_id').then(stats => {
		var tank_id = stats[sess.account_id].map(s => s.tank_id);

		return wotblitz.encyclopedia.vehicles(tank_id, null, ['cost', 'name']);
	});
}).then(sold => {
	return Object.keys(sold)
		.filter(key => sold[key]) // skip missing tanks
		.map(key => ({
			cost: sold[key].cost.price_gold * 400 + sold[key].cost.price_credit,
			name: sold[key].name
		}))
		.sort((a, b) => a.cost - b.cost);
}).then(logger.write, logger.error);

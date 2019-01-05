#!/usr/bin/env node

var concat = require('concat-stream');
var logger = require('./lib/logger.js');

process.exitCode = 0;
process.stdin.pipe(concat(buf => {
	var period;
	var tanks;

	if (buf.length < 2) {
		process.exitCode = 1;
		return logger.error('sort-wr-period: input not reconized');
	}

	try {
		period = JSON.parse(buf.toString());
	} catch (e) {
		process.exitCode = 2;
		e.code = 'EJSON';
		return logger.error(e);
	}

	if ('tanks' in period) {
		tanks = period.tanks;
	} else if (Object.keys(period).length > 0) {
		tanks = period;
	} else {
		process.exitCode = 1;
		return logger.error('sort-wr-period: input not reconized');
	}

	var result = {};
	var ordered = Object.entries(tanks).sort(([, a], [, b]) => {
		var A = a.wins / a.battles;
		var B = b.wins / b.battles;
		var direction = 1;

		if (A < B) return 1;
		if (A > B) return -1;
		if (Math.round(A * 1000) < 501) direction = -1; // invert sort for tanks with less than 50.05%
		if (a.battles < b.battles) return 1 * direction;
		if (a.battles > b.battles) return -1 * direction;

		return 0;
	});

	for (var [key, value] of ordered) {
		result[key] = value;
	}

	logger.write(result);
}));

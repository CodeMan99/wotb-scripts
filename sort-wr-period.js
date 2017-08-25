#!/usr/bin/env node

var concat = require('concat-stream');
var logger = require('./lib/logger.js')();

process.stdin.pipe(concat(buf => {
	var period;

	try {
		period = JSON.parse(buf.toString());
	} catch (e) {
		return logger.error(e);
	}

	var ordered = period.tanks.sort((a, b) => {
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

	logger.write(ordered);
}));

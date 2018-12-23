#!/usr/bin/env node

var concat = require('concat-stream');
var logger = require('./lib/logger.js');

process.stdin.pipe(concat(buf => {
	var period;
	var tanks;

	try {
		period = JSON.parse(buf.toString());
	} catch (e) {
		return logger.error(e);
	}

	if ('tanks' in period) {
		tanks = period.tanks;
	} else if (Object.keys(period).length > 0) {
		tanks = period;
	} else {
		return logger.error('filter-wr: input not reconized');
	}

	var result = {};

	for (var [key, value] of Object.entries(tanks)) {
		if (value.battles > 2) {
			result[key] = value;
		}
	}

	logger.write(result);
}));

#!/usr/bin/env node

var concat = require('concat-stream');
var logger = require('./lib/logger.js');

process.exitCode = 0;
process.stdin.pipe(concat(buf => {
	var period;
	var tanks;

	if (buf.length < 2) {
		process.exitCode = 1;
		return logger.error('filter-wr: input not reconized');
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

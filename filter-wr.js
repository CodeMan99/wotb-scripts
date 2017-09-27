#!/usr/bin/env node

var concat = require('concat-stream');
var logger = require('./lib/logger.js')();

process.stdin.pipe(concat(buf => {
	var period;
	var tanks;

	try {
		period = JSON.parse(buf.toString());
	} catch (e) {
		return logger.error(e);
	}

	if (Array.isArray(period)) {
		tanks = period;
	} else if ('tanks' in period) {
		tanks = period.tanks;
	} else {
		return logger.error('filter-wr: input not reconized');
	}
	
	logger.write(tanks.filter(tank => tank.battles > 2));
}));

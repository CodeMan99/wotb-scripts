#!/usr/bin/env node

var concat = require('concat-stream');

process.stdin.pipe(concat(buf => {
	var period;

	try {
		period = JSON.parse(buf.toString());
	} catch (e) {
		return console.error(e.stack);
	}

	var ordered = period.tanks.sort((a, b) => {
		var A = a.wins / a.battles;
		var B = b.wins / b.battles;

		if (A < B) return 1;
		if (A > B) return -1;
		if (a.battles < b.battles) return 1;
		if (a.battles > b.battles) return -1;

		return 0;
	});

	if (process.stdout.isTTY) {
		console.dir(ordered, {colors: true});
	} else {
		console.log(JSON.stringify(ordered, null, 2));
	}
}));

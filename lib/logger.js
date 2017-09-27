exports.setOptions = createLogger;
exports.setOptions();
exports.error = err => console.error(err.stack || err);

function createLogger(options) {
	if (process.stdout.isTTY) {
		options = Object.assign({colors: true}, options);
		exports.write = data => console.dir(data, options);
	} else {
		options = Object.assign({replacer: null, indent: 2}, options);
		exports.write = data => console.log(JSON.stringify(data, options.replacer, options.indent));
	}

	return exports;
}

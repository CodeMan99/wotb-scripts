module.exports = createLogger;

function createLogger(options) {
	options = Object.assign({
		colors: true,
		indent: 2
	}, options);

	options.write = function(data) {
		if (process.stdout.isTTY) {
			console.dir(data, options);
		} else {
			console.log(JSON.stringify(data, options.replacer, options.indent));
		}
	};

	options.error = function(err) {
		console.error(err.stack || err);
	};

	options.handle = function(promise) {
		return promise.then(options.write, options.error);
	};

	return options;
}

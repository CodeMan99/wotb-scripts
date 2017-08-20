module.exports = createLogger;

function createLogger(options) {
	options = Object.assign({
		colors: true,
		indent: 2
	}, options);

	return {
		write: function(data) {
			if (process.stdout.isTTY) {
				console.dir(data, options);
			} else {
				console.log(JSON.stringify(data, options.replacer, options.indent));
			}
		},
		error: function(err) {
			console.error(err.stack || err);
		}
	};
}

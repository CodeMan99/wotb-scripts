#!/usr/bin/env node

const Parser = require('stream-json/Parser');
const StreamObject = require('stream-json/streamers/StreamObject');
const {Transform, Writable} = require('stream');
const {'default': createStream} = require('table/dist/createStream');

function WriteTableStream(options) {
	if (!(this instanceof WriteTableStream)) {
		return new WriteTableStream(options);
	}

	options = Object.assign({objectMode: true}, options);
	Writable.call(this, options);
	this._tableStream = createStream(options);
}

WriteTableStream.super_ = Writable;
WriteTableStream.prototype = Object.create(Writable.prototype, {
	constructor: {
		configurable: true,
		enumerable: false,
		value: WriteTableStream,
		writable: true
	}
});

WriteTableStream.prototype._write = function(chunk, encoding, next) {
	let err = null;

	try {
		this._tableStream.write(chunk);
	} catch (e) {
		err = e;
	}

	next(err);
};

WriteTableStream.prototype._final = function(done) {
	process.stdout.write('\n', done);
};

{
	const onerror = (message=false, stack=true) => {
		return function(err) {
			if (message && err.message) {
				console.error(err.message);
			}

			if (stack && err.stack) {
				console.error(err.stack);
			}

			if (!(err instanceof Error)) {
				console.error(err);
			}

			this.end();
		};
	};
	let headerRow = ['WR %', 'W', 'L', 'B', 'Name'];
	let rowKeys = ['percentage', 'wins', 'losses', 'battles', 'name'];
	let options = {
		columnDefault: {
			alignment: 'right',
			width: 5
		},
		columnCount: 5,
		columns: {
			0: {
				width: 7
			},
			4: {
				alignment: 'left',
				width: 27
			}
		}
	};

	process.stdin
		.pipe(new Parser())
		.once('error', onerror())
		.pipe(new StreamObject({
			objectFilter({current}) {
				if (current && 'battles' in current) {
					return current.battles > 0;
				}
			}
		}))
		.once('error', onerror())
		.pipe(new Transform({
			objectMode: true,
			transform(chunk, enc, next) {
				let err = null;
				let row = null;

				try {
					row = rowify(chunk.value, {
						columns: rowKeys,
						custom: {
							name: winRateColor(chunk.value)(chunk.key),
							percentage: percentage(chunk.value)
						}
					});
				} catch (e) {
					err = e;
				}

				if (headerRow) {
					if (!err) {
						this.push(headerRow);
					}

					headerRow = null;
				}

				next(err, row);
			}
		}))
		.once('error', onerror())
		.pipe(new WriteTableStream(options))
		.once('error', onerror(true, false));
}

/**
 * Convert a flat object to an array of values suitable for use with [table]{@link https://npmjs.com/package/table}.
 *
 * @param {Object} obj source of plain values
 * @param {Object} [options]
 * @param {string[]} [options.columns] the key names to use. Order is respected. Default is the result of `Object.keys(obj)`
 * @param {Object} [options.custom=null] additional values to use. Keys must not overlap with source obj.
 * @param {*} [options.default=''] value to use if a column name is not found in either the source obj or additional custom values.
 * @returns {Array} values in the same order as the specified columns
 */
function rowify(obj, options) {
	const columns = options && options.columns || Object.keys(obj);
	const custom = options && options.custom;
	const missingValue = options && options['default'] || '';
	const row = [];

	// add keys if no columns were specified
	if (custom && !options.columns) {
		columns.push(...Object.keys(custom));
	}

	for (const column of columns) {
		if (obj.hasOwnProperty(column)) {
			row.push(obj[column]);
		} else if (custom && custom.hasOwnProperty(column)) {
			row.push(custom[column]);
		} else {
			row.push(missingValue);
		}
	}

	return row;
}

function percentage({wins, battles}, decimals=2) {
	return (wins / battles * 100).toFixed(decimals) + '%';
}

function winRateColor({wins, battles}) {
	const p = wins / battles;

	let color = 35;

	if (p < 0.36333) { color = 31; } else
	if (p < 0.49999) { color = 33; } else
	if (p < 0.66666) { color = 32; } else
	if (p < 0.74999) { color = 34; }

	return s => `\u001b[${color}m${s}\u001b[0m`;
}

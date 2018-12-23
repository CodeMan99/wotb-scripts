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
	process.stdout.write('\n');
	done(null);
};

{
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
		.pipe(new StreamObject({
			objectFilter({current}) {
				if (current && 'battles' in current) {
					return current.battles > 0;
				}
			}
		}))
		.pipe(new Transform({
			objectMode: true,
			transform(chunk, enc, next) {
				let err = null;
				let row = null;

				try {
					row = rowify(chunk.value, {
						columns: rowKeys,
						custom: {
							name: chunk.key,
							percentage: percentage(chunk.value)
						}
					});
				} catch (e) {
					err = e;
				}

				if (headerRow) {
					this.push(headerRow);
					headerRow = null;
				}

				next(err, row);
			}
		}))
		.pipe(new WriteTableStream(options));
}

function rowify(obj, options) {
	const columns = options && options.columns || Object.keys(obj);
	const custom = options && options.custom;
	const missingValue = options && options['default'] || '';
	const row = [];

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

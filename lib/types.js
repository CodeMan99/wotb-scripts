module.exports = {
	list: list,
	fields: fields,
	modules: modules,
	provision: provision,
	numbers: numbers
};

function list(val, memo) {
	return (memo || []).concat(val.split(','));
}

function fields(val, memo) {
	return (memo || []).concat(val.split(',').map(s => s.toLowerCase()));
}

var moduleFields = {
	e: 'engine',
	t: 'turret',
	g: 'gun',
	s: 'suspension'
};

function modules(val, memo) {
	var lookup = val[0].toLowerCase();
	var field = moduleFields[lookup];
	var idResult = val.match(/[0-9]+$/);

	if (!idResult) throw new Error('module id not found');
	if (!field) throw new Error('Unknown module selection');

	return Object.assign({}, memo, {
		[field]: Number(idResult[0])
	});
}

function provision(val) {
	if (!val) return null;

	switch (val[0]) {
	case 'E':
	case 'e':
		return 'equipment';
	case 'O':
	case 'o':
		return 'optionalDevice';
	default:
		throw new Error('invalid provision type');
	}
}

function numbers(val, memo) {
	return (memo || []).concat(val.split(',').map(Number));
}

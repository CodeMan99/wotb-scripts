module.exports = addMissingVehicles;

var missing = {
	'55889': {
		is_premium: true,
		tier: 6,
		type: 'mediumTank',
		name: 'Cromwell B',
		nation: 'uk',
	},
}

function addMissingVehicles(current, fields, filter) {
	for (var k in missing) {
		if (k in current) throw new Error('Vehicle key "' + k + '" exists in current')
		if (filter && Object.keys(filter).find(f => filter[f].indexOf(missing[k][f]) === -1)) continue
		current[k] = {}
		fields.forEach(f => current[k][f] = missing[k][f])
	}

	return current
}

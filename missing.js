module.exports = addMissingVehicles;

var missing = {
	// Example missing tank
	/**
	 * '55889': {
	 *	 is_premium: true,
	 *	 tier: 6,
	 *	 type: 'mediumTank',
	 *	 name: 'Cromwell B',
	 *	 nation: 'uk',
	 * },
	 */
	'52225': {
		is_premium: true,
		tier: 3,
		type: 'lightTank',
		name: 'BT-SV',
		nation: 'ussr',
	},
	'64081': {
		is_premium: true,
		tier: 1,
		type: 'heavyTank',
		name: 'Mk. 1 Heavy Tank',
		nation: 'uk',
	},
	'59137': {
		is_premium: true,
		tier: 7,
		type: 'heavyTank',
		name: 'IS-2',
		nation: 'ussr',
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

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
	'64769': {
		is_premium: true,
		tier: 8,
		type: 'heavyTank',
		name: 'IS-6 Fearless',
		nation: 'ussr',
	},
}

function addMissingVehicles(current, fields, filter) {
	var key, field

	for (key in missing) {
		if (key in current && current[key] !== null) throw new Error('Vehicle key "' + key + '" exists in current')
		if (filter && !filter(missing[key], key)) continue

		current[key] = {}

		for (field of fields) {
			current[key][field] = missing[key][field]
		}
	}

	return current
}

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
	'1329': {
		is_premium: false,
		tier: 1,
		type: 'lightTank',
		name: 'Renault NC-31',
		nation: 'china',
	},
	'81': {
		is_premium: false,
		tier: 1,
		type: 'mediumTank',
		name: 'Vickers Medium Mk. I',
		nation: 'uk',
	},
	'577': {
		is_premium: false,
		tier: 1,
		type: 'lightTank',
		name: 'Renault FT',
		nation: 'france',
	},
	'3089': {
		is_premium: false,
		tier: 1,
		type: 'lightTank',
		name: 'Leichttraktor',
		nation: 'germany',
	},
	'545': {
		is_premium: false,
		tier: 1,
		type: 'lightTank',
		name: 'T1 Cunningham',
		nation: 'usa',
	},
	'609': {
		is_premium: false,
		tier: 1,
		type: 'lightTank',
		name: 'Renault Otsu',
		nation: 'japan',
	},
	// '3329': {
	// 	is_premium: false,
	// 	tier: 1,
	// 	type: 'lightTank',
	// 	name: 'MS-1',
	// 	nation: 'ussr',
	// },
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

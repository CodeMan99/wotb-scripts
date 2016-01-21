module.exports = addMissingVehicles;

function addMissingVehicles(current, fields, callback) {
  var missing = {
    '55073': {
      is_premium: true,
      name: 'T7 Combat Car',
      nation: 'usa',
      tier: 2,
      type: 'lightTank'
    },
    '64849': {
      is_premium: true,
      name: 'Sentinel AC-1',
      nation: 'uk',
      tier: 4,
      type: 'mediumTank'
    },
    '54353': {
      is_premium: true,
      name: 'Excelsior',
      nation: 'uk',
      tier: 5,
      type: 'heavyTank'
    },
    '63841': {
      is_premium: true,
      name: 'Panzer IV Anko Special',
      nation: 'japan',
      tier: 5,
      type: 'mediumTank'
    }
  }

  for (var k in missing) {
    if (k in current) return callback(new Error('Vehicle key "' + k + '" exists in current'))
    current[k] = {}
    fields.forEach(f => current[k][f] = missing[k][f])
  }

  callback(null, current)
}

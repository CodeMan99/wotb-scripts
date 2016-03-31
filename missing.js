module.exports = addMissingVehicles;

function addMissingVehicles(current, fields, callback) {
  var missing = {
  // Example of a missing vehicle, include at least these fields:
  /* '55073': {
   *   is_premium: true,
   *   name: 'T7 Combat Car',
   *   nation: 'usa',
   *   tier: 2,
   *   type: 'lightTank'
   * },
   */
  }

  for (var k in missing) {
    if (k in current) return callback(new Error('Vehicle key "' + k + '" exists in current'))
    current[k] = {}
    fields.forEach(f => current[k][f] = missing[k][f])
  }

  callback(null, current)
}

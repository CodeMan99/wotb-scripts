var fs = require('fs');
var fullpath;
var os = require('os');
var path = require('path');

module.exports = {
	Session: Session,
	load: load
};

function load(filename) {
	fullpath = path.resolve(os.homedir(), filename || '.wotblitz.json');

	return new Promise((resolve, reject) => {
		fs.readFile(fullpath, 'utf8', (err, data) => {
			// report errors that are not "file does not exist"
			if (err && err.code !== 'ENOENT') return reject(err);

			data = JSON.parse(data || '{"account_id":null,"auth":null,"clan_id":null}');
			resolve(Object.assign(new Session(), data));
		});
	});
}

function Session(accountId, auth, clanId) {
	this.account_id = accountId;
	this.auth = auth;
	this.clan_id = clanId;
}

Session.prototype.expiresAt = function expiresAt() {
	if (this.auth === null) throw new Error('session is logged out, no expire information');

	return new Date(Number(this.auth.expires_at) * 1000);
};

Session.prototype.isLoggedIn = function isLoggedIn() {
	return this.auth !== null && Number(this.auth.expires_at) > (Date.now() / 1000);
};

Session.prototype.save = function save() {
	var self = this;

	if (typeof fullpath !== 'string') {
		return Promise.reject(new Error('session not created with the "load" function'));
	}

	return new Promise((resolve, reject) => {
		fs.writeFile(fullpath, JSON.stringify(self, null, 2), 'utf8', err => {
			if (err) return reject(err);
			resolve(self);
		});
	});
};

Object.defineProperty(Session.prototype, 'token', {
	configurable: true,
	enumerable: true,
	get: function() {
		return this.isLoggedIn() ? this.auth.access_token : null;
	}
});

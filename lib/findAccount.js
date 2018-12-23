const wotblitz = require('wotblitz')();

module.exports = search;

function search(nickname) {
	nickname = nickname.toLowerCase();

	return wotblitz.account.list(nickname).then(accounts => {
		let player = null;

		if (accounts.length === 1) {
			player = accounts[0];
		} else {
			player = accounts.find(account => account.nickname.startsWith(nickname));
		}

		if (player) {
			return player;
		}

		throw new Error(`No account found for "${nickname}"`);
	});
}

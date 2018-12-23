module.exports = Count;

function Count() {
	this.wins = 0;
	this.losses = 0;
	this.battles = 0;
}

Count.prototype.add = function add(other) {
	this.wins += other.wins;
	this.losses += other.losses;
	this.battles += other.battles;
	return this;
};

Count.prototype.difference = function difference(other) {
	this.wins -= other.wins;
	this.losses -= other.losses;
	this.battles -= other.battles;
	return this;
};

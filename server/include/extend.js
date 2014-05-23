// todo: can make this function more robust
exports.extend = function(x) {
	 for(i in x)
		this[i] = x[i];

	return this;
};

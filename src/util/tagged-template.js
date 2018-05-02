const exists = (literals, value, ...rest) => {

	if (value === null || value === undefined)
		return "";

	const values = [value, ...rest];

	const firstLiterals = [...literals];
	const lastLiteral = firstLiterals.pop();

	return firstLiterals.reduce((merged, literal, index) => merged + literal + values[index], "") + lastLiteral;
};

module.exports = {
	exists
};

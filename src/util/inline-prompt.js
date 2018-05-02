const readline = require("readline");

const promptYesNo = async question => {

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	let isReady;

	do {

		isReady = await new Promise(resolve => rl.question(`${question} (y/n): `, answer => resolve(answer)));

		if (isReady.toLowerCase() === "n") {
			return false;
		}

	} while (isReady.toLowerCase() !== "y");

	rl.close();

	return true;
};

module.exports = {
	promptYesNo
};

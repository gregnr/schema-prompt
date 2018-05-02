const yaml = require("js-yaml");

const serializeObject = (type, object) => {

	switch (type) {

		case "json":
			return JSON.stringify(object, undefined, 4);

		case "yaml":
			return yaml.safeDump(object);

		default:
			throw new Error(`Unknown type '${type}'`);
	}
};

const getFileExtension = type => {

	switch (type) {

		case "json":
			return "json";

		case "yaml":
			return "yml";

		default:
			throw new Error(`Unknown type '${type}'`);
	}
};

module.exports = {
	serializeObject,
	getFileExtension
};

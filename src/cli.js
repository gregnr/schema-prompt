#! /usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const glob = require("glob");
const chalk = require("chalk");
const Ajv = require("ajv");
const ajv = Ajv();

const packageFileName = "package.json";
const configPropertyName = "schema-prompt";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const indentUnit = "  ";

const promptProperties = async (level, properties) => await Object.entries(properties)

	.reduce(async (mergedPromise, [property, propertySchema]) => {

		const merged = await mergedPromise;

		const defaultValue = propertySchema.default;

		const indent = indentUnit.repeat(level);

		if (propertySchema.title) {
			rl.write(chalk`${indent}{green # ${propertySchema.title}}\n`);
		}

		if (propertySchema.description) {
			rl.write(chalk`${indent}{green # ${propertySchema.description}}\n`);
		}

		const question = chalk`${indent}{blueBright ${property}}{magenta ${defaultValue ? ` (${defaultValue})` : ""}}: `

		if (propertySchema.properties) {

			rl.write(`${question}\n\n`);

			return Object.assign(merged, {
				[property]: await promptProperties(level + 1, propertySchema.properties)
			});
		}

		let generatedProperty = undefined;
		let valid = false;

		do {

			let answer = await new Promise(resolve => rl.question(question, answer => resolve(answer)));

			if (answer === "" && defaultValue) {
				answer = defaultValue;
			}

			if (propertySchema.type === "number") {

				const numberAnswer = Number(answer);

				if (!isNaN(numberAnswer)) {
					answer = numberAnswer;
				}
			}

			generatedProperty = {
				[property]: answer
			};

			const validate = ajv.compile({
				properties: {
					[property]: propertySchema
				}
			});

			valid = validate(generatedProperty);

			if (!valid) {
				rl.write(`'${property}' ${validate.errors[0].message}\n`);
			}

		} while (!valid);

		rl.write("\n");

		return Object.assign(merged, generatedProperty);

	}, Promise.resolve({}));

try {

	const packageBuffer = fs.readFileSync(packageFileName);

	const package = JSON.parse(packageBuffer.toString("utf8"));

	const config = package[configPropertyName];

	if (!config)
		throw new Error(`No '${configPropertyName}' config property in '${packageFileName}'`);

	if (!config.files)
		throw new Error(`No 'files' specified for '${configPropertyName}'`);

	const schemaFiles = config.files
		.map(pattern => glob.sync(pattern))
		.reduce((merged, files) => [...merged, ...files]);

	schemaFiles.forEach(async schemaFile => {

		const schemaBuffer = fs.readFileSync(schemaFile);

		const schema = JSON.parse(schemaBuffer.toString("utf8"));

		if (!schema.properties)
			return;

		const fileName = schemaFile.replace(".schema", "");

		console.log();
		console.log(`Creating file '${fileName}'`);
		console.log();

		const generatedObject = await promptProperties(0, schema.properties);

		rl.close();
		
		console.log(generatedObject);
	})
}
catch (err) {

	console.error(err);
	process.exit(1);
}

process.on("unhandledRejection", err => console.error(err));

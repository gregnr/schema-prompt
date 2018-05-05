#! /usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const chalk = require("chalk");
const SchemaPrompter = require("./lib/schema-prompter");
const { promptYesNo } = require("./util/inline-prompt");
const { serializeObject, getFileExtension } = require("./lib/serializer");
const { PrompterCancelledError } = require("./lib/prompter-errors");

const packageFileName = "package.json";
const configPropertyName = "schema-prompt";

try {

	const packageBuffer = fs.readFileSync(packageFileName);

	const package = JSON.parse(packageBuffer.toString("utf8"));

	const config = package[configPropertyName];

	if (!config)
		throw new Error(`No '${configPropertyName}' config property in '${packageFileName}'`);

	if (!config.files)
		throw new Error(`No 'files' specified for '${configPropertyName}'`);

	const type = config.type || "yaml";

	const schemaFiles = config.files
		.map(pattern => glob.sync(pattern))
		.reduce((merged, files) => [...merged, ...files]);

	schemaFiles.forEach(async schemaFile => {

		const filePath = `${schemaFile.replace(".schema.json", "")}.${getFileExtension(type)}`;

		console.log();
		const isReady = await promptYesNo(chalk`Ready to setup {magentaBright ${filePath}}?`);

		if (!isReady) {
			process.exit(0);
		}

		const schemaBuffer = fs.readFileSync(schemaFile);

		const schema = JSON.parse(schemaBuffer.toString("utf8"));

		if (!schema.properties)
			return;

		const prompter = new SchemaPrompter(filePath);
		
		console.log();

		try {

			const generatedObject = await prompter.promptSchema(schema);

			const serializedData = serializeObject(type, generatedObject);
	
			fs.writeFileSync(filePath, serializedData);
	
			console.log(chalk`Successfully created file {magentaBright ${filePath}}`);
		}
		catch (err) {

			if (err instanceof PrompterCancelledError) {

				console.log(chalk`Failed to created file {magentaBright ${filePath}}. Prompter was cancelled`);

				return;
			}

			throw err;
		}
	});
}
catch (err) {

	console.error(err);
	process.exit(1);
}

process.on("unhandledRejection", err => console.error(err));

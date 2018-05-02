const blessed = require("blessed");
const Ajv = require("ajv");
const { exists } = require("../util/tagged-template");

const ajv = Ajv();

class SchemaPrompter {

	constructor(filePath) {

		const program = blessed.program();

		program.key(["escape", "C-c"], (ch, key) => {
			return process.exit(0);
		});

		this.screen = blessed.screen({
			smartCSR: true,
			dockBorders: true,
			debug: true,
			program
		});
		
		const background = blessed.box({
			left: 1,
			width: "100%-2",
			height: "100%",
			style: {
				fg: "white",
				bg: "black"
			}
		});
		
		const header = blessed.box({
			top: 0,
			left: 0,
			width: "100%",
			height: 4,
			padding: {
				top: 1,
				left: 2,
				right: 2,
				bottom: 0
			}
		});
		
		const headerLine = blessed.line({
			orientation: "horizontal",
			top: 2,
			width: "100%",
			style: {
				fg: "lightgrey"
			}
		});
		
		this.title = blessed.text({
			width: "shrink",
			height: 3,
			bold: true,
			content: "",
			align: "left",
			tags: true,
			padding: {
				left: 1,
				right: 1
			},
			border: {
				type: "line"
			},
			style: {
				border: {
					fg: "white"
				}
			}
		});
		
		this.secondaryTitle = blessed.text({
			width: "shrink",
			height: 3,
			bold: true,
			content: "",
			align: "left",
			tags: true,
			padding: {
				top: 1,
				left: 2,
				right: 1
			}
		});

		const titleLayout = blessed.layout({
			top: -1,
			left: 0,
			width: "100%",
			height: 3,
			layout: "inline"
		});

		titleLayout.append(this.title);
		titleLayout.append(this.secondaryTitle);
		
		this.tertiaryTitle = blessed.text({
			top: 0,
			right: 0,
			bold: true,
			content: filePath,
			align: "right",
			style: {
				fg: "lightgrey"
			}
		});
		
		const body = blessed.box({
			bottom: 0,
			left: 0,
			width: "100%",
			height: "100%-4",
			padding: {
				left: 1,
				right: 1
			},
			style: {
				fg: "white"
			}
		});
		
		this.description = blessed.text({
			top: 0,
			left: 0,
			height: 1,
			padding: {
				left: 1,
				right: 1
			},
			content: ""
		});
		
		this.input = blessed.textbox({
			top: 2,
			left: 0,
			right: 0,
			height: 3,
			inputOnFocus: true,
			padding: {
				left: 1,
				right: 1
			},
			border: {
				type: "line"
			},
			style: {
				fg: "green",
				border: {
					fg: "grey"
				}
			}
		});

		this.error = blessed.text({
			top: 6,
			left: 0,
			height: 1,
			padding: {
				left: 1,
				right: 1
			},
			style: {
				fg: "red"
			},
			content: ""
		});
		
		header.append(titleLayout);
		header.append(this.tertiaryTitle);
		
		body.append(this.description);
		body.append(this.input);
		body.append(this.error);
		
		background.append(header);
		background.append(headerLine);
		background.append(body);
		
		this.screen.append(background);
		
		this.input.key("C-u", () => {
			this.input.clearValue();
			this.screen.render();
		});
	}

	promptProperty(breadcrums, propertySchema, isRequired) {

		const property = breadcrums.slice(-1);

		const formattedTitle = 

		this.title.content = `{cyan-fg}{bold}${breadcrums.join("{/bold}{/cyan-fg} {8-fg}->{/8-fg} {cyan-fg}{bold}")}{/bold}{/cyan-fg}`;
		this.secondaryTitle.content = `${exists`{11-fg}${propertySchema.title}{/11-fg}`}`;
		this.description.content = propertySchema.description || `Value for '${property}'`;
		this.error.content = "";

		this.input.focus();

		if (propertySchema.default) {
			this.input.setValue(propertySchema.default.toString());
		}

		this.screen.render();

		const validate = ajv.compile({
			properties: {
				[property]: propertySchema
			}
		});

		return new Promise(resolve => {
			
			const submitHandler = answer => {

				if (answer === "" && isRequired) {
					this.error.content = "This value is required";
					this.input.clearValue();
					this.input.focus();
					this.screen.render();
					return;
				}

				if (propertySchema.type === "number") {

					const numberAnswer = Number(answer);

					if (!isNaN(numberAnswer)) {
						answer = numberAnswer;
					}
				}

				const generatedProperty = {
					[property]: answer
				};

				const valid = validate(generatedProperty);

				if (!valid) {
					this.error.content = `This value ${validate.errors[0].message}`;
					this.input.clearValue();
					this.input.focus();
					this.screen.render();
					return;
				}

				this.input.clearValue();

				this.input.removeListener("submit", submitHandler);

				resolve(generatedProperty);
			};

			this.input.on("submit", submitHandler);
		});
	}

	promptProperties(breadcrums, properties, requiredProperties = []) {
		
		return Object.entries(properties)

			.reduce(async (mergedPromise, [property, propertySchema]) => {

				const merged = await mergedPromise;

				if (propertySchema.properties) {

					return Object.assign(merged, {
						[property]: await this.promptProperties([...breadcrums, property], propertySchema.properties, propertySchema.required)
					});
				}

				const generatedProperty = await this.promptProperty([...breadcrums, property], propertySchema, requiredProperties.includes(property));

				return Object.assign(merged, generatedProperty);

			}, Promise.resolve({}));
	}

	async promptSchema(schema) {

		const generatedObject = await this.promptProperties(["$"], schema.properties, schema.required);

		this.screen.destroy();

		return generatedObject;
	}
}

module.exports = SchemaPrompter;

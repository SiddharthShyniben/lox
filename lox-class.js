export default class LoxClass {
	constructor(name) {
		this.name = name;
	}

	toString() {
		return `<class ${this.name}>`;
	}
}

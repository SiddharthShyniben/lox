import Environment from './environment.js';

export default class LoxFunction {
	constructor(declaration) {
		this.declaration = declaration;
	}

	call(interpreter, args) {
		const environment = new Environment(interpreter.globals);
		this.declaration.params.forEach((param, i) => {
			environment.define(param.lexeme, args[i]);
		});

		interpreter.executeBlock(this.declaration.body, environment);
		return null;
	}

	arity() {
		return this.declaration.params.length;
	}

	toString() {
		return `<fn ${this.declaration.name.lexeme}>`;
	}
}

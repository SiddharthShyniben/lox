import Environment from './environment.js';
import Return from './return.js';

export default class LoxFunction {
	constructor(declaration, closure) {
		this.declaration = declaration;
		this.closure = closure;
	}

	call(interpreter, args) {
		const environment = new Environment(this.closure);
		this.declaration.params.forEach((param, i) => {
			environment.define(param, args[i]);
		});

		try {
			interpreter.executeBlock(this.declaration.body, environment);
		} catch (error) {
			if (error instanceof Return) {
				return error.value;
			}

			throw error;
		}

		return null;
	}

	arity() {
		return this.declaration.params.length;
	}

	toString() {
		return `<fn ${this.declaration.name.lexeme}>`;
	}
}

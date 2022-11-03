import Environment from './environment.js';
import Return from './return.js';

import debug from 'debug';

const log = debug('loxfunction');

export default class LoxFunction {
	constructor(declaration, closure) {
		log('Creating LoxFunction', declaration.name.lexeme, 'with' + (closure ? ' values ' + Array.from(closure.values.keys()).join(', ') : 'out closure'));
		this.declaration = declaration;
		this.closure = closure;
	}

	call(interpreter, args) {
		log('calling', this.declaration.name.lexeme);
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

	bind(instance) {
		log('binding', this.declaration.name.lexeme, 'to', instance.klass.name);
		const environment = new Environment(this.closure);
		environment.define({lexeme: 'this'}, instance); // hack

		return new LoxFunction(this.declaration, environment);
	}

	arity() {
		return this.declaration.params.length;
	}

	toString() {
		return `<fn ${this.declaration.name.lexeme}>`;
	}
}

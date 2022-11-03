import {RuntimeError} from './runtime-error.js';

export default class Environment {
	constructor(enclosing = undefined) {
		this.values = new Map();
		this.enclosing = enclosing;
	}

	define(key, value) {
		this.values.set(key.lexeme, value); //ugh, idk where we get lexeme lol
	}

	get(name) {
		if (this.values.has(name.lexeme)) {
			return this.values.get(name.lexeme);
		}

		if (this.enclosing) return this.enclosing.get(name);
		
		throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
	}

	assign(name, value) {
		if (this.values.has(name.lexeme)) {
			this.values.set(name.lexeme, value);
			return;
		}

		if (this.enclosing) {
			this.enclosing.assign(name, value);
			return;
		}

		throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
	}

	getAt(distance, name) {
		this.ancestor(distance).get(name.lexeme);
	}

	ancestor(distance) {
		let environment = this;
		for (let i = 0; i < distance; i++) {
			environment = environment.enclosing;
		}

		return environment;
	}

	assignAt(distance, name, value) {
		this.ancestor(distance).values.put(name.lexeme, value);
	}
}

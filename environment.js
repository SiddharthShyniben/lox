import {RuntimeError} from './runtime-error.js';

export default class Environment {
	constructor(enclosing = undefined) {
		this.values = new Map();
		this.enclosing = enclosing;
	}

	define(key, value) {
		this.values.set(key, value);
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
}

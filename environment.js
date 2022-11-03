import {RuntimeError} from './runtime-error.js';

import unbug from 'unbug';

function* _id() {
	let i = 0;
	while (true) {
		yield i++;
	}
}

const id = _id();

const environment = unbug('environment');

export default class Environment {
	constructor(enclosing) {
		this.id = id.next().value;
		this.log = environment.extend(this.id.toString());

		this.log(`Creating new environment with${enclosing ? ' enclosing values ' + Array.from(enclosing.values.keys()).join(', ') : 'out enclosing'}`);
		this.values = new Map();
		this.enclosing = enclosing;
	}

	define(key, value) {
		this.log('Defining:', key.lexeme);
		this.values.set(key.lexeme, value);
	}

	get(name) {
		this.log('Getting:', name.lexeme);
		if (this.values.has(name.lexeme)) {
			this.log('Found', name.lexeme, 'in this environment');
			return this.values.get(name.lexeme);
		}

		this.log(name.lexeme, 'not found in this environment');
		if (this.enclosing) {
			this.log('Searching enclosing for', name.lexeme);
			return this.enclosing.get(name);
		}

		throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
	}

	assign(name, value) {
		this.log('Assigning:', name.lexeme);
		if (this.values.has(name.lexeme)) {
			this.log('Found', name.lexeme, 'in this environment');
			this.values.set(name.lexeme, value);
			return;
		}

		if (this.enclosing) {
			this.log('Not found in this environment, searching enclosing');
			this.enclosing.assign(name, value);
			return;
		}

		throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
	}

	getAt(distance, name) {
		this.ancestor(distance).get(name);
	}

	ancestor(distance) {
		let environment = this;
		for (let i = 0; i < distance; i++) {
			environment = environment.enclosing;
		}

		return environment;
	}

	assignAt(distance, name, value) {
		this.ancestor(distance).values.set(name.lexeme, value);
	}
}

import {RuntimeError} from './runtime-error.js';

import debug from 'debug';

const log = debug('loxinstance');

export default class LoxInstance {
	constructor(klass) {
		log('Initializing instance of %s', klass.name);
		this.klass = klass;
		this.fields = new Map();
	}

	toString() {
		return `<instance ${this.klass.name}>`;
	}

	set(name, value) {
		log('Setting %s', name.lexeme);
		this.fields.set(name.lexeme, value);
	}

	get(name) {
		log('Getting %s', name.lexeme);
		if (this.fields.has(name.lexeme)) {
			log('Found field %s', name.lexeme);
			return this.fields.get(name.lexeme);
		}

		log('No field found, looking in methods');
		const method = this.klass.findMethod(name.lexeme);
		if (method) {
			log('Found method %s', name.lexeme);
			return method.bind(this);
		}

		throw new RuntimeError(name, `Undefined property '${name}'.`);
	}
}

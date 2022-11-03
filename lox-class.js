import LoxInstance from './lox-instance.js';

import debug from 'debug';

const log = debug('loxclass');

export default class LoxClass {
	constructor(name, methods = new Map()) {
		log('Creating class %s', name, 'with methods:', Array.from(methods.keys()).join(', '));
		this.name = name;
		this.methods = methods;
	}

	toString() {
		return `<class ${this.name}>`;
	}

	call(interpreter, args) {
		log('Calling class %s', this.name);
		const instance = new LoxInstance(this);
		return instance;
	}

	findMethod(name) {
		log('Finding method %s', name);
		return this.methods.get(name);
	}

	arity() {
		return 0;
	}
}

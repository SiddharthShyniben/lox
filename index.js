import Scanner from './scanner.js';
import Parser from './parser.js';
import Interpreter from './interpreter.js';
import Resolver from './resolver.js';
import readline from 'node:readline';
import fs from 'node:fs';
import unbug from 'unbug';

import {hasError, clearError, hasRuntimeError, clearRuntimeError} from './utils.js';

const args = process.argv.slice(2);
const interpreter = new Interpreter();
const log = unbug('lox');

if (args.length > 1) {
	log('Too many arguments');
	console.log('Usage: jlox [file]');
	process.exit(64);
} else if (args.length === 1) {
	log('Running file: %s', args[0]);
	runFile(args[0]);
} else {
	log('Running repl');
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	process.stdout.write('jlox> ');
	rl.on('line', line => {
		log('Running line: %s', line);
		if (line) run(line);
		process.stdout.write('jlox> ');
		clearError();
		clearRuntimeError();
	});
}

function runFile(file) {
	const fileContents = fs.readFileSync(file, 'utf8');
	run(fileContents);
	if (hasError()) process.exit(65);
	if (hasRuntimeError()) process.exit(70);
}

function run(code) {
	const scanner = new Scanner(code);
	const tokens = scanner.scanTokens();
	const parser = new Parser(tokens);
	const statements = parser.parse();

	if (hasError()) return;

	const resolver = new Resolver(interpreter);
	resolver.resolve(statements);

	if (hasError()) return;

	interpreter.interpret(statements);
}

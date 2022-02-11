import Scanner from './scanner.js';
import Parser from './parser.js';
import Interpreter from './interpreter.js';
import ASTPrinter from './ast-printer.js';
import readline from 'readline';
import fs from 'fs';

import {hasError, clearError, hasRuntimeError, clearRuntimeError} from './utils.js';

const args = process.argv.slice(2);
const interpreter = new Interpreter();

if (args.length > 1) {
	console.log('Usage: jlox [file]');
	process.exit(64);
} else if (args.length === 1) {
	runFile(args[0]);
} else {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	process.stdout.write('jlox> ');
	rl.on('line', line => {
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

	interpreter.interpret(statements);
}

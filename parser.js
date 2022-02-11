import {Assign, Binary, Unary, Logical, Literal, Grouping, Variable, Call} from './types/expr.js';
import {Print, Var, Block, If, While, Expression, Function} from './types/stmt.js';
import {error} from './utils.js';

export default class Parser {
	constructor(tokens) {
		this.tokens = tokens;
		this.current = 0;
	}

	parse() {
		const statements = [];
		while (!this.isAtEnd()) {
			statements.push(this.declaration());
		}

		return statements;
	}

	block() {
		const statements = [];

		while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
			statements.push(this.declaration());
		}

		this.consume('RIGHT_BRACE', 'Expect } after block.');
		return statements;
	}

	declaration() {
		try {
			if (this.match('FUN')) return this.function('function');
			if (this.match('VAR')) return this.varDeclaration();

			return this.statement();
		} catch (error) {
			if (error instanceof ParseError) {
				this.synchronize();
			} else {
				throw error;
			}
		}
	}

	function(kind) {
		const name = this.consume('IDENTIFIER', `Expect ${kind} name.`);

		this.consume('LEFT_PAREN', `Expect '(' after ${kind} name.`);

		const parameters = [];

		if (!this.check('RIGHT_PAREN')) {
			do {
				if (parameters.length >= 255) {
					this.error(this.peek(), 'Cannot have more than 255 parameters.');
				}

				parameters.push(this.consume('IDENTIFIER', 'Expect parameter name.'));
			} while (this.match('COMMA'));
		}

		this.consume('RIGHT_PAREN', 'Expect ) after parameters.');
		this.consume('LEFT_BRACE', `Expect { before ${kind} body`);

		const body = this.block();
		return new Function(name, parameters, body);
	}

	varDeclaration() {
		const name = this.consume('IDENTIFIER', 'Expect variable name.');

		let initializer = null;

		if (this.match('EQUAL')) {
			initializer = this.expression();
		}

		this.consume('SEMICOLON', 'Expect ; after variable declaration.');

		return new Var(name, initializer);
	}

	statement() {
		if (this.match('FOR')) return this.forStatement();
		if (this.match('IF')) return this.ifStatement();
		if (this.match('PRINT')) return this.printStatement();
		if (this.match('WHILE')) return this.whileStatement();
		if (this.match('LEFT_BRACE')) return new Block(this.block());

		return this.expressionStatement();
	}

	forStatement() {
		this.consume('LEFT_PAREN', 'Expect ( after for.');
		
		let initializer = null;

		if (this.match('SEMICOLON')) {
			initializer = null;
		} else if (this.match('VAR')) {
			initializer = this.varDeclaration();
		} else {
			initializer = this.expressionStatement();
		}

		let condition = null;

		if (!this.check('SEMICOLON')) {
			condition = this.expression();
		}
		this.consume('SEMICOLON', 'Expect ; after for condition.');

		let increment = null;
		if (!this.check('RIGHT_PAREN')) {
			increment = this.expression();
		}
		this.consume('RIGHT_PAREN', 'Expect ) after for clauses.');

		let body = this.statement();
		
		if (increment) {
			body = new Block([body, new Expression(increment)]);
		}

		condition ??= new Literal(true);
		body = new While(condition, body);

		if (initializer) {
			body = new Block([initializer, body]);
		}

		return body;
	}

	whileStatement() {
		this.consume('LEFT_PAREN', 'Expect ( after while.');
		const condition = this.expression();
		this.consume('RIGHT_PAREN', 'Expect ) after while condition.');

		const body = this.statement();

		return new While(condition, body);
	}

	ifStatement() {
		this.consume('LEFT_PAREN', 'Expect ( after if.');
		const condition = this.expression();
		this.consume('RIGHT_PAREN', 'Expect ) after if condition.');

		const thenBranch = this.statement();
		let elseBranch = null;

		if (this.match('ELSE')) {
			elseBranch = this.statement();
		}

		return new If(condition, thenBranch, elseBranch);
	}

	printStatement() {
		const value = this.expression();
		this.consume('SEMICOLON', 'Expect ; after value.');
		return new Print(value);
	}	

	expressionStatement() {
		const expr = this.expression();
		this.consume('SEMICOLON', 'Expect ; after expression.');
		return expr;
	}

	expression() {
		return this.assignment();
	}

	assignment() {
		const expr = this.or();

		if (this.match('EQUAL')) {
			const equals = this.previous();
			const value = this.assignment();

			if (expr instanceof Variable) {
				const name = expr.name;
				return new Assign(name, value);
			}

			error(equals, 'Invalid assignment target.');
		}

		return expr;
	}

	or() {
		let expr = this.and();

		while (this.match('OR')) {
			const operator = this.previous();
			const right = this.and();
			expr = new Logical(expr, operator, right);
		}

		return expr;
	}

	and() {
		let expr = this.equality();

		while(this.match('AND')) {
			const operator = this.previous();
			const right = this.equality();
			expr = new Logical(expr, operator, right);
		}

		return expr;
	}

	equality() {
		let expr = this.comparison();

		while (this.match('BANG_EQUAL', 'EQUAL_EQUAL')) {
			const operator = this.previous();
			const right = this.comparison();
			expr = new Binary(expr, operator, right);
		}

		return expr;
	}

	comparison() {
		let expr = this.term();

		while (this.match('GREATER', 'GREATER_EQUAL', 'LESS', 'LESS_EQUAL')) {
			const operator = this.previous();
			const right = this.term();
			expr = new Binary(expr, operator, right);
		}

		return expr;
	}

	term() {
		let expr = this.factor();

		while (this.match('MINUS', 'PLUS')) {
			const operator = this.previous();
			const right = this.factor();
			expr = new Binary(expr, operator, right);
		}

		return expr;
	}

	factor() {
		let expr = this.unary();

		while(this.match('SLASH', 'STAR')) {
			const operator = this.previous();
			const right = this.unary();
			expr = new Binary(expr, operator, right);
		}

		return expr;
	}

	unary() {
		if (this.match('BANG', 'MINUS')) {
			const operator = this.previous();
			const right = this.unary();
			return new Unary(operator, right);
		}

		return this.call();
	}

	call() {
		let expr = this.primary();

		while (true) {
			if (this.match('LEFT_PAREN')) {
				expr = this.finishCall(expr);
			} else {
				break;
			}
		}

		return expr;
	}

	finishCall(callee) {
		const args = [];

		if (!this.check('RIGHT_PAREN')) {
			do {
				if (args.length >= 255) {
					this.error(this.peek(), 'Cannot have more than 8 arguments.');
				}
				args.push(this.expression());
			} while (this.match('COMMA'));
		}

		const paren = this.consume('RIGHT_PAREN', 'Expect ) after arguments.');

		return new Call(callee, paren, args);
	}

	primary() {
		if (this.match('FALSE')) {
			return new Literal(false);
		}

		if (this.match('TRUE')) {
			return new Literal(true);
		}

		if (this.match('NIL')) {
			return new Literal(null);
		}

		if (this.match('NUMBER', 'STRING')) {
			return new Literal(this.previous().literal);
		}

		if (this.match('IDENTIFIER')) {
			return new Variable(this.previous());
		}

		if (this.match('LEFT_PAREN')) {
			const expr = this.expression();
			this.consume('RIGHT_PAREN', 'Expect ) after expression.');
			return new Grouping(expr);
		}

		throw this.error(this.peek(), 'Expect expression.');
	}

	match(...types) {
		for (const type of types) {
			if (this.check(type)) {
				this.advance();
				return true;
			}
		}

		return false;
	}

	consume(type, message) {
		if (this.check(type)) {
			return this.advance();
		}

		throw this.error(this.peek(), message);
	}

	error(token, message) {
		error(token, message);
		return new ParseError();
	}

	synchronize() {
		this.advance();

		while (!this.isAtEnd()) {
			if (this.previous().type === 'SEMICOLON') {
				return;
			}

			switch (this.peek()?.type) {

			case 'CLASS': case 'FUN': case 'VAR': case 'FOR': case 'IF': case 'WHILE': case 'PRINT': case 'RETURN':
				return;
			}
		}

		this.advance();
	}

	check(type) {
		if (this.isAtEnd()) {
			return false;
		}

		return this.peek()?.type === type;
	}

	advance() {
		if (!this.isAtEnd()) {
			this.current++;
		}

		return this.previous();
	}

	isAtEnd() {
		return this.peek()?.type === 'EOF';
	}

	peek() {
		return this.tokens[this.current];
	}

	previous() {
		return this.tokens[this.current - 1];
	}
}

export class ParseError extends Error {
	constructor() {
		super('Parse error');
	}
}

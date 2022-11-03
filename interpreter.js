import {RuntimeError} from './runtime-error.js';
import {runtimeError} from './utils.js';
import Environment from './environment.js';
import LoxFunction from './lox-function.js';
import LoxClass from './lox-class.js';
import LoxInstance from './lox-instance.js';
import Return from './return.js';

import unbug from 'unbug';

const log = unbug('interpreter');

export default class Interpreter {
	constructor() {
		log('Initializing interpreter');
		this.globals = new Environment();
		this.environment = this.globals;
		this.locals = new Map();

		log('Initializing globals');
		this.globals.define({lexeme: 'clock'}, { // hack
			arity: () => 0,
			call: process.uptime,
			toString: () => '<native fn>',
		});
	}

	interpret(statements) {
		log('Interpreting statements');
		try {
			for (const stmt of statements) {
				this.execute(stmt);
			}
		} catch (error) {
			log('Interpreting statements failed');
			if (error instanceof RuntimeError) {
				log('Interpreting statements failed with runtime error');
				runtimeError(error);
			} else {
				log('Interpreting statements failed with error');
				throw error;
			}
		}
	}

	stringify(value) {
		if (value === null) return 'nil';

		if (typeof value === 'number') {
			const text = value.toString();
			if (text.endsWith('.0')) return text.slice(0, -2);
		}

		return value.toString();
	}

	visitFunctionStmt(stmt) {
		log('Visiting function statement');
		const _function = new LoxFunction(stmt, this.environment);
		this.environment.define(stmt.name, _function);
		return null;
	}

	visitCallExpr(expr) {
		log('Visiting call expression');
		const callee = this.evaluate(expr.callee);

		const args = expr.args.map(arg => this.evaluate(arg));

		if (!(callee instanceof LoxFunction) && !(callee instanceof LoxClass)) {
			throw new RuntimeError(expr.paren, 'Can only call functions and classes.');
		}

		if (args.length !== callee.arity()) {
			throw new RuntimeError(expr.paren, `Expected ${callee.arity()} arguments but got ${args.length}`);
		}

		return callee.call(this, args);
	}

	visitLiteralExpr(expr) {
		log('Visiting literal expression');
		return expr.value;
	}

	visitGroupingExpr(expr) {
		log('Visiting grouping expression');
		return this.evaluate(expr.expression);
	}

	visitUnaryExpr(expr) {
		log('Visiting unary expression');
		const right = this.evaluate(expr.right);

		switch (expr.operator.type) {
			case 'MINUS':
				this.checkNumberOperand(expr.operator, right);
				return -right;
			case 'BANG':
				return !this.isTruthy(right);
		}

		return null;
	}

	isTruthy(value) {
		if (value === null) return false;
		if (typeof value === 'boolean') return value;
		return true;
	}

	visitBinaryExpr(expr) {
		log('Visiting binary expression');
		const left = this.evaluate(expr.left);
		const right = this.evaluate(expr.right);

		switch (expr.operator.type) {
			case 'GREATER':
				this.checkNumberOperands(expr.operator, left, right);
				return left > right;
			case 'GREATER_EQUAL':
				this.checkNumberOperands(expr.operator, left, right);
				return left >= right;
			case 'LESS':
				this.checkNumberOperands(expr.operator, left, right);
				return left < right;
			case 'LESS_EQUAL':
				this.checkNumberOperands(expr.operator, left, right);
				return left <= right;
			case 'MINUS':
				this.checkNumberOperands(expr.operator, left, right);
				return left - right;
			case 'SLASH':
				this.checkNumberOperands(expr.operator, left, right);
				return left / right;
			case 'STAR':
				this.checkNumberOperands(expr.operator, left, right);
				return left * right;
			case 'PLUS':
				if (typeof left === 'number' && typeof right === 'number') {
					return left + right;
				} else if (typeof left === 'string' && typeof right === 'string') {
					return left + right;
				}

				throw new RuntimeError(expr.operator, 'Operands must be two numbers or two strings.');
			case 'BANG_EQUAL':
				return !this.isEqual(left, right);
			case 'EQUAL_EQUAL':
				return this.isEqual(left, right);
		}

		return null;
	}

	visitExpressionStmt(stmt) {
		log('Visiting expression statement');
		this.evaluate(stmt.expr ?? stmt.expression); // hmm
	}

	visitPrintStmt(stmt) {
		log('Visiting print statement');
		const value = this.evaluate(stmt.expression);
		console.log(this.stringify(value));
	}

	visitReturnStmt(stmt) {
		log('Visiting return statement');
		const value = stmt.value ? this.evaluate(stmt.value) : null;
		throw new Return(value);
	}

	visitVarStmt(stmt) {
		log('Visiting variable statement');
		let value = null;
		if (stmt.initializer) {
			value = this.evaluate(stmt.initializer);
		}

		this.environment.define(stmt.name, value);
	}

	visitVariableExpr(expr) {
		log('Visiting variable expression');
		return this.lookupVariable(expr.name, expr);
	}

	lookupVariable(name, expr) {
		log('Looking up variable %s', name.lexeme);
		const distance = this.locals.get(expr.lexeme) ?? this.locals.get(name.lexeme);
		log('Distance: %d', distance);

		if (distance) {
			return this.environment.getAt(distance, name);
		} else {
			return this.globals.get(name);
		}
	}

	visitAssignExpr(expr) {
		log('Visiting assignment expression');
		const value = this.evaluate(expr.value);
		const distance = this.locals.get(expr.lexeme);

		if (distance) {
			this.environment.assignAt(distance, expr.name, value);
		} else {
			this.globals.assign(expr.name, value);
		}

		this.environment.assign(expr.name, value);
		return value;
	}

	visitBlockStmt(expr) {
		log('Visiting block statement');
		this.executeBlock(expr.statements, new Environment(this.environment));
	}

	visitClassStmt(stmt) {
		log('Visiting class statement');
		this.environment.define(stmt.name, null);

		const methods = new Map();
		stmt.methods.forEach(method => {
			const _function = new LoxFunction(method, this.environment);
			methods.set(method.name.lexeme, _function);
		});

		const klass = new LoxClass(stmt.name.lexeme, methods);

		this.environment.define(stmt.name, klass);
	}

	visitIfStmt(stmt) {
		log('Visiting if statement');
		if (this.isTruthy(this.evaluate(stmt.condition))) {
			this.execute(stmt.thenBranch);
		} else if (stmt.elseBranch) {
			this.execute(stmt.elseBranch);
		}
	}

	visitWhileStmt(stmt) {
		log('Visiting while statement');
		while (this.isTruthy(this.evaluate(stmt.condition))) {
			this.execute(stmt.body);
		}
	}

	visitLogicalExpr(expr) {
		log('Visiting logical expression');
		const left = this.evaluate(expr.left);

		if (expr.operator.type === 'OR') {
			if (this.isTruthy(left)) return left;
		} else {
			if (!this.isTruthy(left)) return left;
		}

		return this.evaluate(expr.right);
	}

	visitGetExpr(expr) {
		log('Visiting get expression');
		const object = this.evaluate(expr.object);
		if (object instanceof LoxInstance) {
			return object.get(expr.name);
		}

		throw new RuntimeError(expr.name, 'Only instances have properties.');
	}

	visitSetExpr(expr) {
		log('Visiting set expression');
		const object = this.evaluate(expr.object);

		if (!(object instanceof LoxInstance)) {
			throw new RuntimeError('Only instances have fields.');
		}

		const value = this.evaluate(expr.value);
		object.set(expr.name, value);
		return value;
	}

	visitThisExpr(expr) {
		log('Visiting this expression');
		return this.lookupVariable(expr.keyword, expr);
	}

	executeBlock(statements, environment) {
		log('Executing block');
		const previous = this.environment;
		try {
			this.environment = environment;

			for (const stmt of statements) {
				this.execute(stmt);
			}
		} finally {
			this.environment = previous;
		}
	}

	isEqual(a, b) {
		return a === b; // no
	}

	checkNumberOperand(operator, operand) {
		if (typeof operand === 'number') return;
		throw new RuntimeError(operator, 'Operand must be a number.');
	}

	checkNumberOperands(operator, left, right) {
		if (typeof left === 'number' && typeof right === 'number') return;
		throw new RuntimeError(operator, 'Operands must be numbers.');
	}

	evaluate(expr) {
		return expr.accept(this);
	}

	execute(stmt) {
		return stmt.accept(this);
	}

	resolve(expr, depth) {
		log('Resolving %o', expr, 'at depth', depth);
		const thing = expr.lexeme ? expr : expr.name;
		this.locals.set(thing.lexeme, depth);
	}
}

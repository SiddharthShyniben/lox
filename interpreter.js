import {RuntimeError} from './runtime-error.js';
import {runtimeError} from './utils.js';
import Environment from './environment.js';
import LoxFunction from './lox-function.js';
import LoxClass from './lox-class.js';
import Return from './return.js';

export default class Interpreter {
	constructor() {
		this.globals = new Environment();
		this.environment = this.globals;
		this.locals = new Map();

		this.globals.define('clock', {
			arity: () => 0,
			call: process.uptime,
			toString: () => '<native fn>',
		});
	}

	interpret(statements) {
		try {
			for (const stmt of statements) {
				this.execute(stmt);
			}
		} catch (error) {
			if (error instanceof RuntimeError) {
				runtimeError(error);
			} else {
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
		const _function = new LoxFunction(stmt, this.environment);
		this.environment.define(stmt.name, _function);
		return null;
	}

	visitCallExpr(expr) {
		const callee = this.evaluate(expr.callee);

		const args = expr.args.map(arg => this.evaluate(arg));

		if (!(callee instanceof LoxFunction)) {
			throw new RuntimeError(expr.paren, 'Can only call functions and classes.');
		}

		if (args.length !== callee.arity()) {
			throw new RuntimeError(expr.paren, `Expected ${callee.arity()} arguments but got ${args.length}`);
		}

		return callee.call(this, args);
	}

	visitLiteralExpr(expr) {
		return expr.value;
	}

	visitGroupingExpr(expr) {
		return this.evaluate(expr.expression);
	}

	visitUnaryExpr(expr) {
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
		this.evaluate(stmt.expr ?? stmt.expression); // hmm
	}

	visitPrintStmt(stmt) {
		const value = this.evaluate(stmt.expression);
		console.log(this.stringify(value));
	}

	visitReturnStmt(stmt) {
		const value = stmt.value ? this.evaluate(stmt.value) : null;
		throw new Return(value);
	}

	visitVarStmt(stmt) {
		let value = null;
		if (stmt.initializer) {
			value = this.evaluate(stmt.initializer);
		}

		this.environment.define(stmt.name, value);
	}

	visitVariableExpr(expr) {
		return this.lookupVariable(expr.name, expr);
	}

	lookupVariable(name, expr) {
		const distance = this.locals.get(expr);

		if (distance) {
			return this.environment.getAt(distance, name);
		} else {
			return this.globals.get(name);
		}
	}

	visitAssignExpr(expr) {
		const value = this.evaluate(expr.value);

		const distance = this.locals.get(expr);

		if (distance) {
			this.environment.assignAt(distance, expr.name, value);
		} else {
			this.globals.assign(expr.name, value);
		}

		this.environment.assign(expr.name, value);
		return value;
	}

	visitBlockStmt(expr) {
		this.executeBlock(expr.statements, new Environment(this.environment));
	}

	visitClassStmt(stmt) {
		this.environment.define(stmt.name, null);
		const klass = new LoxClass(stmt.name.lexeme);
		this.environment.define(stmt.name, klass);
	}

	visitIfStmt(stmt) {
		if (this.isTruthy(this.evaluate(stmt.condition))) {
			this.execute(stmt.thenBranch);
		} else if (stmt.elseBranch) {
			this.execute(stmt.elseBranch);
		}
	}

	visitWhileStmt(stmt) {
		while (this.isTruthy(this.evaluate(stmt.condition))) {
			this.execute(stmt.body);
		}
	}

	visitLogicalExpr(expr) {
		const left = this.evaluate(expr.left);

		if (expr.operator.type === 'OR') {
			if (this.isTruthy(left)) return left;
		} else {
			if (!this.isTruthy(left)) return left;
		}

		return this.evaluate(expr.right);
	}

	executeBlock(statements, environment) {
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
		this.locals.set(expr, depth);
	}
}

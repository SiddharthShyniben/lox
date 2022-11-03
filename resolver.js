import {error} from './utils.js';
import unbug from 'unbug';

const log = unbug('resolver');

export default class Resolver {
	constructor(interpreter) {
		log('Creating resolver');
		this.interpreter = interpreter;
		this.scopes = [];
		this.currentFunction = 'NONE';
	}

	visitBlockStmt(stmt) {
		log('Entering scope via block statement');
		this.beginScope();
		this.resolve(stmt.statements);
		this.endScope();
	}

	visitVarStmt(stmt) {
		this.declare(stmt.name);

		if (stmt.initializer) {
			this.resolveExpr(stmt.initializer);
		}

		this.define(stmt.name);
	}

	visitVariableExpr(expr) {
		if (this.scopes.length > 0 && !this.scopes[this.scopes.length - 1].has(expr.name.lexeme)) {
			error(expr.name, 'Cannot read local variable in its own initializer.');
		}
		
		this.resolveLocal(expr, expr.name);
	}

	visitAssignExpr(expr) {
		this.resolveExpr(expr.value);
		this.resolveLocal(expr, expr.name);
	}

	visitFunctionStmt(stmt) {
		this.declare(stmt.name);
		this.define(stmt.name);

		this.resolveFunction(stmt, 'FUNCTION');
	}

	visitExpressionStmt(stmt) {
		this.resolveExpr(stmt.expression);
	}

	visitIfStmt(stmt) {
		this.resolveExpr(stmt.condition);
		this.resolve(stmt.thenBranch.statements);

		if (stmt.elseBranch) {
			this.resolve(stmt.elseBranch.statements);
		}
	}

	visitPrintStmt(stmt) {
		this.resolveExpr(stmt.expression);
	}

	visitReturnStmt(stmt) {
		if (this.currentFunction === 'NONE') {
			error(stmt.keyword, 'Cannot return from top-level code.');
		}

		if (stmt.value) {
			this.resolveExpr(stmt.value);
		}
	}

	visitWhileStmt(stmt) {
		this.resolveExpr(stmt.condition);
		this.resolve(stmt.body);
	}

	visitBinaryExpr(expr) {
		this.resolveExpr(expr.left);
		this.resolveExpr(expr.right);
	}

	visitCallExpr(expr) {
		this.resolveExpr(expr.callee);

		expr.args.forEach(arg => {
			this.resolveExpr(arg);
		});
	}

	visitGroupingExpr(expr) {
		this.resolveExpr(expr.expression);
	}

	visitLiteralExpr() {}

	visitLogicalExpr(expr) {
		this.resolveExpr(expr.left);
		this.resolveExpr(expr.right);
	}
	
	visitUnaryExpr(expr) {
		this.resolveExpr(expr.right);
	}

	resolveFunction(func, type) {
		const enclosingFunction = this.currentFunction;
		this.currentFunction = type;
		this.beginScope();

		func.params.forEach(param => {
			this.declare(param);
			this.define(param);
		});

		this.resolve(func.body);

		this.endScope();
		this.currentFunction = enclosingFunction;
	}

	resolveLocal(expr, name) {
		log('Resolving local', name.lexeme);
		for (let i = this.scopes.length - 1; i > 0; i--) {
			if (this.scopes[i].has(name.lexeme)) {
				log('Resolved local', name.lexeme, 'in scope %o', this.scopes[i]);
				this.interpreter.resolve(expr, this.scopes.length - (i + 1));
				return;
			}
		}
	}

	visitClassStmt(stmt) {
		this.declare(stmt.name);
		this.define(stmt.name);

		this.beginScope();
		this.scopes[this.scopes.length - 1].set('this', true);

		stmt.methods.forEach(method => {
			this.resolveFunction(method, 'METHOD');
		});

		this.endScope();
	}

	visitGetExpr(expr) {
		this.resolveExpr(expr.object);
	}

	visitSetExpr(expr) {
		this.resolveExpr(expr.object);
		this.resolveExpr(expr.value);
	}

	visitThisExpr(expr) {
		this.resolveLocal(expr, expr.keyword);
	}

	declare(name) {
		if (this.scopes.length === 0) {
			return;
		}

		const scope = this.scopes[this.scopes.length - 1];
		if (scope.has(name.lexeme)) {
			error(name, 'Variable with this name already declared in this scope.');
		}

		scope.set(name.lexeme, false);
	}

	define(name) {
		if (this.scopes.length === 0) {
			return;
		}

		this.scopes[this.scopes.length - 1].set(name.lexeme, true);
	}

	beginScope() {
		this.scopes.push(new Map());
	}

	endScope() {
		this.scopes.pop();
	}

	resolve(statements) {
		statements.forEach(stmt => {
			this.resolveStmt(stmt);
		});
	}

	resolveStmt(stmt) {
		stmt.accept(this);
	}

	resolveExpr(expr) {
		expr.accept(this);
	}
}

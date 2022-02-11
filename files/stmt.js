export class Block {
	constructor(statements) {
		this.statements = statements;
	}

	accept(visitor) {
		return visitor.visitBlockStmt(this);
	}
}

export class Expression {
	constructor(expression) {
		this.expression = expression;
	}

	accept(visitor) {
		return visitor.visitExpressionStmt(this);
	}
}

export class Function {
	constructor(name, params, body) {
		this.name = name;
		this.params = params;
		this.body = body;
	}

	accept(visitor) {
		return visitor.visitFunctionStmt(this);
	}
}

export class If {
	constructor(condition, thenBranch, elseBranch) {
		this.condition = condition;
		this.thenBranch = thenBranch;
		this.elseBranch = elseBranch;
	}

	accept(visitor) {
		return visitor.visitIfStmt(this);
	}
}

export class Print {
	constructor(expression) {
		this.expression = expression;
	}

	accept(visitor) {
		return visitor.visitPrintStmt(this);
	}
}

export class Var {
	constructor(name, initializer) {
		this.name = name;
		this.initializer = initializer;
	}

	accept(visitor) {
		return visitor.visitVarStmt(this);
	}
}

export class While {
	constructor(condition, body) {
		this.condition = condition;
		this.body = body;
	}

	accept(visitor) {
		return visitor.visitWhileStmt(this);
	}
}
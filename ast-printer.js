export default class AstPrinter {
	print(expr) {
		return expr.accept(this);
	}

	visitBinaryExpr(expr) {
		return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
	}

	visitGroupingExpr(expr) {
		return this.parenthesize('group', expr.expression);
	}

	visitLiteralExpr(expr) {
		if (expr.value == null) {
			return 'nil';
		}

		return expr.value.toString();
	}

	visitUnaryExpr(expr) {
		return this.parenthesize(expr.operator.lexeme, expr.right);
	}

	parenthesize(name, ...exprs) {
		let result = `(${name}`;

		for (let expr of exprs) {
			result += ' ';
			result += expr.accept(this);
		}

		result += ')';

		return result;
	}
}

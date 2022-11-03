/* eslint-disable indent */
import {mkdirSync, writeFileSync} from 'node:fs';
const args = process.argv.slice(2);

if (args.length !== 1) {
	console.error('Usage: generate-ast <file>');
	process.exit(64);
}

const outputDir = args[0];

function defineAst(outputDir, basename, types) {
	try {
		mkdirSync(outputDir);
	} catch (error) {
		/* bruh */
	}
	writeFileSync(`${outputDir}/${basename.toLowerCase()}.js`,
`
${types.map(
	type => defineType(basename, ...type.split(':').map(x => x.trim()))
).join('\n\n')}
`.trim()
	);
}

function defineType(basename, className, contents) {
	return `
export class ${className} {
	constructor(${contents}) {
${
	contents
		.split(',')
		.map(x => x.trim())
		.map(type => `		this.${type} = ${type};`)
		.join`\n`
}
	}

	accept(visitor) {
		return visitor.visit${className}${basename}(this);
	}
}
	`.trim();
}

// function defineVisitor(basename, types) {
// 	return dedent`
// 		export class Visitor {
// 			${types.map(type => {
// 				const typeName = type.split(':')[0].trim();
// 				return `visit${typeName}${basename}(${basename.toLowerCase()}) {}`
// 			}).join('\n')}
// 		}
// 	`
// }

defineAst(outputDir, 'Expr', [
	'Assign: name, value',
	'Binary: left, operator, right',
	'Call: callee, paren, args',
	'Grouping: expression',
	'Literal: value',
	'Logical: left, operator, right',
	'Unary: operator, right',
	'Variable: name',
]);

defineAst(outputDir, 'Stmt', [
	'Block: statements',
	'Class: name, methods',
	'Expression: expression',
	'Function: name, params, body',
	'If: condition, thenBranch, elseBranch',
	'Print: expression',
	'Return: keyword, value',
	'Var: name, initializer',
	'While: condition, body',
]);

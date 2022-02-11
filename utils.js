let hadError = false;
let hadRuntimeError = false;

export const hasError = () => hadError;
export const clearError = () => hadError = false;

export const hasRuntimeError = () => hadRuntimeError;
export const clearRuntimeError = () => hadRuntimeError = false;

export function error(token = {}, message = 'Error') {
	if (token.type == 'EOF') {
		report(token.line, ' at end', message);
	} else {
		report(token.line, ' at "' + token.lexeme + '"', message);
	}

	hadError = true;
}

export function runtimeError(error) {
	console.error(`${error.message}
[line ${error.token.line}]`);
	hadRuntimeError = true;
}

export function report(line, where, message) {
	console.error(`[line ${line}] Error${where}: ${message}`);
}

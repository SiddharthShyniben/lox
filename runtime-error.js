export class RuntimeError extends Error {
	constructor(token, message) {
		super(message);
		this.name = 'RuntimeError';
		this.token = token;
	}
}

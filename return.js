export default class Return extends Error {
	constructor(value) {
		super(null);
		this.value = value;
	}
}

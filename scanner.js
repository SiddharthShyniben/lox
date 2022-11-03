import Token from './token.js';
import {error} from './utils.js';
import unbug from 'unbug';

const log = unbug('scanner');

export default class Scanner {
	constructor(source) {
		log('Initializing scanner with source:', source);
		this.source = source;

		this.tokens = [];
		this.start = 0;
		this.current = 0;
		this.line = 1;

		this.keywords = {
			and: 'AND',
			class: 'CLASS',
			else: 'ELSE',
			false: 'FALSE',
			for: 'FOR',
			fun: 'FUN',
			if: 'IF',
			nil: 'NIL',
			or: 'OR',
			print: 'PRINT',
			return: 'RETURN',
			super: 'SUPER',
			this: 'THIS',
			true: 'TRUE',
			var: 'VAR',
			while: 'WHILE',
		};
	}

	scanTokens() {
		log('Scanning tokens');
		while (!this.isAtEnd()) {
			this.start = this.current;
			this.scanToken();
		}
		log('Finished scanning tokens');

		this.tokens.push(new Token('EOF', '', null, this.line))
		return this.tokens;
	}

	scanToken() {
		const c = this.advance();
		log('Scanning:', c);

		switch (c) {
			// Bad code, but the tut says to do it and i'm afraid ill break
			// something
			case '(': this.addToken('LEFT_PAREN'); break;
			case ')': this.addToken('RIGHT_PAREN'); break;
			case '{': this.addToken('LEFT_BRACE'); break;
			case '}': this.addToken('RIGHT_BRACE'); break;
			case ',': this.addToken('COMMA'); break;
			case '.': this.addToken('DOT'); break;
			case '-': this.addToken('MINUS'); break;
			case '+': this.addToken('PLUS'); break;
			case ';': this.addToken('SEMICOLON'); break;
			case '*': this.addToken('STAR'); break;

			case '!':
				this.addToken(this.match('=') ? 'BANG_EQUAL' : 'BANG');
				break;
			case '=':
				this.addToken(this.match('=') ? 'EQUAL_EQUAL' : 'EQUAL');
				break;
			case '<':
				this.addToken(this.match('=') ? 'LESS_EQUAL' : 'LESS');
				break;
			case '>':
				this.addToken(this.match('=') ? 'GREATER_EQUAL' : 'GREATER');
				break;

			case '/':
				if (this.match('/')) {
					while (this.peek() != '\n' && !this.isAtEnd()) {
						this.advance();
					}
				} else {
					this.addToken('SLASH');
				}
				break;

			case ' ':
			case '\r':
			case '\t':
				break;

			case '\n':
				this.line++;
				break;

			case '"': this.string(); break;

			default:
				if (this.isDigit(c)) {
					this.number();
				} else if (this.isAlpha(c)) {
					this.identifier();
				} else error(this.line, "Unexpected character '" + c + "'.");
		}
	}

	string() {
		log('Scanning string');
		while (this.peek() != '"' && !this.isAtEnd()) {
			if (this.peek() == '\n') this.line++;
			this.advance();
		}

		if (this.isAtEnd()) {
			error(this.line, "Unterminated string.");
			return;
		}

		this.advance(); // closing "

		const value = this.source.substring(this.start + 1, this.current - 1);
		this.addToken('STRING', value);
	}

	number() {
		log('Scanning number');
		while (this.isDigit(this.peek())) {
			this.advance();
		}

		if (this.peek() == '.' && this.isDigit(this.peekNext())) {
			this.advance();

			while (this.isDigit(this.peek())) {
				this.advance();
			}
		}

		this.addToken('NUMBER', parseFloat(this.source.substring(this.start, this.current)));
	}

	identifier() {
		log('Scanning identifier');
		while (this.isAlphaNumeric(this.peek())) {
			this.advance();
		}

		const text = this.source.substring(this.start, this.current);
		const type = this.keywords[text] ?? 'IDENTIFIER';
		this.addToken(type);
	}

	isAlpha(c) {
		return 'a' <= c && c <= 'z' ||
			'A' <= c && c <= 'Z' ||
			c == '_';
	}

	isAlphaNumeric(c) {
		return this.isAlpha(c) || this.isDigit(c);
	}

	addToken(type, literal = null) {
		log('Adding token:', type, literal);
		const text = this.source.substring(this.start, this.current);
		this.tokens.push(new Token(type, text, literal, this.line));
	}

	peekNext() {
		return this.current + 1 >= this.source.length ? '\0' : this.source.charAt(this.current + 1);
	}

	isDigit(c) {
		return '0' <= c && c <= '9';
	}

	advance() {
		return this.source.charAt(this.current++);
	}

	match(expected) {
		if (this.isAtEnd()) return false;
		if (this.source.charAt(this.current) != expected) return false;

		this.current++;
		return true;
	}

	peek() {
		return this.isAtEnd() ? '\0' : this.source.charAt(this.current);
	}

	isAtEnd() {
		return this.current >= this.source.length;
	}
}

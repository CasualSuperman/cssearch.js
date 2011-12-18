function parse(string) {
	var nodes     = [],
		pos       = 0,
		modeStack = [],
		modes     = parse.ModeList,
		modeCount = modes.length;

	while (string.length) {
		var matched = false;
		for (var i = 0; i < modeCount && !matched; ++i) {
			var match = new modes[i].test(string);
			matched = match.matched;
			if (matched) {
				string = string.substr(match.len);
				nodes.push(match);
			}
		}
		if (!matched) {
			throw "ParseError";
		}
	}
	return nodes;
}

parse.MODES = {};
parse.MODES.NAME ={
	 test: (function() {
		var expr = new RegExp("^(" + reg.NAME + ")", "i");
		return function(str) {
			var match = this.match = str.match(expr);
			if (match !== null) {
				this.token   = match[1];
				this.len     = match[0].length;
				this.matched = true;
				this.type    = parse.TypeList.TAG;
			}
			return this;
		};
	}()),
	exec: (function() {}())
};
parse.MODES.CLASS = {
	test: (function() {
		var expr = new RegExp("^\\.(" + reg.NAME + ")", "i");
		return function(str) {
			var match = this.match = str.match(expr);
			if (match !== null) {
				this.token   = match[1];
				this.len     = match[0].length;
				this.matched = true;
				this.type    = parse.TypeList.CLASS;
			}
			return this;
		};
	}()),
	exec: (function() {}())
};
parse.MODES.ID = {
	test: (function() {
		var expr = new RegExp("^#(" + reg.NAME + ")", "i");
		return function(str) {
			var match = this.match = str.match(expr);
			if (match !== null) {
				this.token   = match[1];
				this.len     = match[0].length;
				this.matched = true;
				this.type    = parse.TypeList.ID;
			}
			return this;
		};
	}()),
	exec: (function() {}())
};
parse.MODES.ATTR = {
	test: (function() {
		var expr = new RegExp("^(\\[\\s*(" + reg.NAME +	")\\s*(?:([~|^$*]?=)\\s*(" + reg.STRING + "))?\\s*\\])", "i")
		return function(str) {
				var match = this.match = str.match(expr);
				if (match !== null) {
					this.token   = match[1];
					this.len     = match[0].length;
					this.matched = true;
					this.type    = parse.TypeList.ATTR;
				}
				return this;
		};
	}()),
	exec: (function() {}())
};
parse.MODES.PSEUDO = {
	test: (function() {
		var matches = [
			/^:(?:(?:first|last|only)-(?:child|of-type))/,
			/^:(?:(?:nth-last|nth)-(?:child|of-type))/, // Followed by n-expression
			/^:(?:empty|enabled|checked|disabled|target|root)/,
			/^:(?:text|password|submit|image|file|reset|button|checkbox|input)/ // Not part of spec.
		],
		len = matches.length;
		return function(str) {
				if (str.indexOf(":") === 0) {
					var length = len;
					for (var i = 0; i < length; i++) {
						var match = str.match(matches[i]);
						if (match !== null) {
							i = length;
							this.matched = true;
							this.token   = match[0];
							this.len     = match[0].length;
							this.type    = parse.TypeList.PSEUDO;
						}
					}
				}
				return this;
		};
	}()),
	exec: (function() {}())
}
parse.MODES.NOT = {
	test: (function() {
		var begin = /^:not\(/i;
		return function(str) {
				if (str.indexOf(")") === 0) {
					this.matched = true;
					this.token   = ")";
					this.len     = 1;
					this.type    = parse.TypeList.NOT_E;
				} else if (begin.test(str)) {
					this.matched = true;
					this.token   = ":not(";
					this.len     = 5;
					this.type    = parse.TypeList.NOT_B;
				}
				return this;
		};
	}()),
	exec: (function() {}())
}
parse.MODES.RELATION = {
	test: (function() {
		var expr = /^\s*([- +>~,])\s*/;
		return function(str) {
				var match = str.match(expr);
				if (match !== null) {
					this.matched = true;
					this.token   = match[1];
					this.len     = match[0].length;
					this.type    = relationship[match[1]];
				}
				return this;
		};
	}()),
	exec: (function() {}())
};
parse.ModeList = [
	parse.MODES.NAME,
	parse.MODES.CLASS,
	parse.MODES.ID,
	parse.MODES.ATTR,
	parse.MODES.PSEUDO,
	parse.MODES.NOT,
	parse.MODES.RELATION
];
parse.TypeList = {
	ID:     0,
	TAG:    1,
	CLASS:  2,
	PSEUDO: 3,
	ATTR:   4,
	NOT_B:  5,
	NOT_E:  6,
	DESC_N: 7,
	CHIL_N: 8,
	NXES_N: 9,
	YNSB_N: 10,
	LIST:   11
}

var relationship = {
	" ": parse.TypeList.DESC_N,
	">": parse.TypeList.CHIL_N,
	"+": parse.TypeList.NXES_N,
	"~": parse.TypeList.YNSB_N,
	",": parse.TypeList.LIST
};

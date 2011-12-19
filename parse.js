window["parse"] = (function() {
var reg = {};
reg.UNICODE = '\\\\[0-9a-f]{1,6}(?:\\r\\n|[ \\n\\r\\t\\f])?';
reg.ESCAPE = reg.UNICODE + "|" + '\\\\[^\\n\\r\\f0-9a-f]';
reg.NONASCII = '[^\\0-\\177]';
reg.NMSTART = '[_a-z]' + "|" + reg.NONASCII + "|" + reg.ESCAPE;
reg.NMCHAR = '[_a-z0-9-]' + "|" + reg.NONASCII + "|" + reg.ESCAPE;
reg.IDENT = '-?' + "(?:" + reg.NMSTART + ")(?:" + reg.NMCHAR + ")*";
reg.NUM = '[0-9]+|[0-9]*\\.[0-9]+';
reg.NAME = "(?:" + reg.NMCHAR + ")+";
reg.N1 = '\\n|\\r\\n|\\r|\\f';
reg.string1 = '"(?:[^\\n\\r\\f\\\\"]' + "|(?:\\\\" + reg.N1 + ")|(?:" + reg.NONASCII + ")|(?:" + reg.ESCAPE + "))*\"";
reg.string2 = '\'(?:[^\\n\\r\\f\\\\\']' + "|(?:\\\\" + reg.N1 + ")|(?:" + reg.NONASCII + ")|(?:" + reg.ESCAPE + "))*'";
reg.STRING = reg.string1 + "|" + reg.string2;

var MODES = {};
MODES.NAME ={
	 test: (function() {
		var expr = new RegExp("^(" + reg.NAME + ")", "i");
		return function(str) {
			var match = this.match = str.match(expr);
			if (match !== null) {
				this.token   = match[1];
				this.len     = match[0].length;
				this.matched = true;
				this.type    = TypeList.TAG;
			}
			return this;
		};
	}()),
	exec: (function() {}())
};
MODES.CLASS = {
	test: (function() {
		var expr = new RegExp("^\\.(" + reg.NAME + ")", "i");
		return function(str) {
			var match = this.match = str.match(expr);
			if (match !== null) {
				this.token   = match[1];
				this.len     = match[0].length;
				this.matched = true;
				this.type    = TypeList.CLASS;
			}
			return this;
		};
	}()),
	exec: (function() {}())
};
MODES.ID = {
	test: (function() {
		var expr = new RegExp("^#(" + reg.NAME + ")", "i");
		return function(str) {
			var match = this.match = str.match(expr);
			if (match !== null) {
				this.token   = match[1];
				this.len     = match[0].length;
				this.matched = true;
				this.type    = TypeList.ID;
			}
			return this;
		};
	}()),
	exec: (function() {}())
};
MODES.ATTR = {
	test: (function() {
		var expr = new RegExp("^(\\[\\s*(" + reg.NAME +	")\\s*(?:([~|^$*]?=)\\s*(" + reg.STRING + "))?\\s*\\])", "i")
		return function(str) {
				var match = this.match = str.match(expr);
				if (match !== null) {
					this.token   = match[1];
					this.len     = match[0].length;
					this.matched = true;
					this.type    = TypeList.ATTR;
				}
				return this;
		};
	}()),
	exec: (function() {}())
};
MODES.PSEUDO = {
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
							this.type    = TypeList.PSEUDO;
						}
					}
				}
				return this;
		};
	}()),
	exec: (function() {}())
}
MODES.NOT = {
	test: (function() {
		var begin = /^:not\(/i;
		return function(str) {
				if (str.indexOf(")") === 0) {
					this.matched = true;
					this.token   = ")";
					this.len     = 1;
					this.type    = TypeList.NOT_E;
				} else if (begin.test(str)) {
					this.matched = true;
					this.token   = ":not(";
					this.len     = 5;
					this.type    = TypeList.NOT_B;
				}
				return this;
		};
	}()),
	exec: (function() {}())
}
MODES.RELATION = {
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
var ModeList = [
	MODES.NAME,
	MODES.CLASS,
	MODES.ID,
	MODES.ATTR,
	MODES.PSEUDO,
	MODES.NOT,
	MODES.RELATION
];
var TypeList = {
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
	" ": TypeList.DESC_N,
	">": TypeList.CHIL_N,
	"+": TypeList.NXES_N,
	"~": TypeList.YNSB_N,
	",": TypeList.LIST
};

return function(string) {
	var nodes     = [],
		pos       = 0,
		modeStack = [],
		modes     = ModeList,
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
}());

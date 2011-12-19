/*!
 * CSSearcher Selector Searcher
 */
(function() {


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

var MODES = {
	NAME: {
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
	},
	CLASS: {
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
	},
	ID: {
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
	},
	ATTR: {
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
	},
	PSEUDO: {
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
	},
	NOT: {
		test: (function() {
			var test = /^(?::not\(\s*|\s*\))/i;
			var begin = /^:not\(\s*/i;
			var end = /^\s*\)/;
			return function(str) {
					if (test.test(str)){
						var ends = str.match(end);
						if (ends !== null) {
							this.matched = true;
							this.token   = ")";
							this.len     = ends[0].length;
							this.type    = TypeList.NOT_END;
						} else {
							var begins = str.match(begin);
							if (begins !== null) {
								this.matched = true;
								this.token   = ":not(";
								this.len     = begins[0].length;
								this.type    = TypeList.NOT_BEGIN;
							}
						}
					}
					return this;
			};
		}()),
		exec: (function() {}())
	},
	RELATION: {
		test: (function() {
			var notnot = /^\s*\)/;
			var expr = /^\s*([- +>~,])\s*/;
			return function(str) {
					if (notnot.test(str))
						return this;
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
	}
}
var ModeList = [
	MODES.RELATION,
	MODES.NAME,
	MODES.ID,
	MODES.CLASS,
	MODES.NOT,
	MODES.PSEUDO,
	MODES.ATTR
];
var TypeList = {
	ID:     0,
	TAG:    1,
	CLASS:  2,
	PSEUDO: 3,
	ATTR:   4,
	NOT_BEGIN:  5,
	NOT_END:  6,
	DESCENDANT_NODE: 7,
	CHILD_NODE: 8,
	NEXT_ELDEST_SIBLING: 9,
	YOUNGER_SIBLING: 10,
	LIST:   11
}

var relationship = {
	" ": TypeList.DESCENDANT_NODE,
	">": TypeList.CHILD_NODE,
	"+": TypeList.NEXT_ELDEST_SIBLING,
	"~": TypeList.YOUNDER_SIBLING,
	",": TypeList.LIST
};

var parse = function(string) {
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
var old = window["parse"];

parse.noConflict = function() {
	window["parse"] = old;
	return parse;
}

window["parse"] = parse;
}());

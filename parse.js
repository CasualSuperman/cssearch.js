function parse(string) {
	var nodes     = [],
		pos       = 0,
		modeStack = [],
		modes     = parse.ModeList,
		modeCount = modes.length;

	while (string.length) {
		var matched = false;
		for (var i = 0; i < modeCount && !matched; ++i) {
			var match = new modes[i](string);
			matched = match.matched;
			if (matched) {
				string = string.substr(match.len);
				nodes.push(match);
			}
		}
		if (! matched) {
			if (nodes[nodes.length - 1].err) {
				nodes[nodes.length - 1].err += string.charAt(0);
			} else {
				nodes.push({
					err: string.charAt(0)
				});
			}
			string = string.substr(1);
		}
	}
	return nodes;
}

parse.MODES = {
	NAME: (function() {
			var expr = new RegExp("^(" + reg.NAME + ")", "i");
			return function(str) {
				var match = this.match = str.match(expr);
				if (match !== null) {
					this.token   = match[1];
					this.len     = match[0].length;
					this.matched = true;
					this.type    = "tag";
				}
				return this;
			};
		}()),
	CLASS: (function() {
			var expr = new RegExp("^\\.(" + reg.NAME + ")", "i");
			return function(str) {
				var match = this.match = str.match(expr);
				if (match !== null) {
					this.token   = match[1];
					this.len     = match[0].length;
					this.matched = true;
					this.type    = "class";
				}
				return this;
			};
		}()),
	ID: (function() {
			var expr = new RegExp("^#(" + reg.NAME + ")", "i");
			return function(str) {
				var match = this.match = str.match(expr);
				if (match !== null) {
					this.token   = match[1];
					this.len     = match[0].length;
					this.matched = true;
					this.type    = "id";
				}
				return this;
			};
		}()),
	ATTR: (function() {
		var expr = new RegExp("^(\\[\\s*(" + reg.NAME +
					")\\s*(?:([~|^$*]?=)\\s*(" + reg.STRING + "))?\\s*\\])", "i")
		return function(str) {
				var match = this.match = str.match(expr);
				if (match !== null) {
					this.token   = match[1];
					this.len     = match[0].length;
					this.matched = true;
					this.type    = "attr";
				}
				return this;
		};
	}()),
	PSEUDO: (function() {
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
							this.type    = "pseudo";
						}
					}
				}
				return this;
		};
	}()),
	NOT: (function() {
		var begin = /^:not\(/i;
		return function(str) {
				if (str.indexOf(")") === 0) {
					this.matched = true;
					this.token   = ")";
					this.len     = 1;
					this.type    = "not-end";
				} else if (begin.test(str)) {
					this.matched = true;
					this.token   = ":not(";
					this.len     = 5;
					this.type    = "not-begin";
				}
				return this;
		};
	}()),
	RELATION: (function() {
		var expr = /^\s*([- +>~,])\s*/;
		return function(str) {
				var match = str.match(expr);
				if (match !== null) {
					this.matched = true;
					this.token   = match[1];
					this.len     = match[0].length;
					this.type    = "relationship";
				}
				return this;
		};
	}())
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

var relationship = {
	DESCENDANT_NODE: " ",
	CHILD_NODE: ">",
	NEXT_ELDEST_SIBLING: "+",
	YOUNGER_SIBLING: "~"
};

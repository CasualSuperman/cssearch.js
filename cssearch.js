(function() {
	var s   = {},
	    old = window.$s;
	s.noConflict = function() {
		window.$s = old;
		return s;
	}
	function tree(selector) {
		var curr = {token: ""};
		var tree = {root: curr};
		while (selector.length) {
			while (! /[ +>~]/.match(selector.charAt(0))) {
				curr.token += selector.shift();
			}
			var relationship = "";
			while (/[ +>~]/.match(selector.chatAt(0))) {
				relationship += selector.shift();
			}
			relationship = relationship.trim();
			switch (relationship) {
				case "":
					relationship = "descendant";
					break;
				case "+":
					relationship = "nextSibling";
					break;
				case ">":
					relationship = "childNode";
					break;
				case "~":
					relationship = "sibling"
					break;
				default:
					throw "ParseError";
					break;
			}
			curr[relationship] = {token: ""};
			curr = curr[relationship];
		}
		return tree;
	}
}());

parse.util = {
	find: function(elem, func) {
		for (var i = 0, len = elem.length; i < len; ++i) {
			if (func(elem[i]))
				return i;
		}
		return -1;
	}
};

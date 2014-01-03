(function() {

var expressionDepthColors = [
    KhanUtil.BLUE,
    KhanUtil.ORANGE,
    KhanUtil.PINK,
    KhanUtil.GREEN,
    KhanUtil.PURPLE,
    KhanUtil.RED,
    KhanUtil.GRAY
];

function Buffer(str) {
    this.str = str;
    this.length = str.length;
    this.position = -1;
}

$.extend(Buffer.prototype, {

    eof: function() {
        return this.position >= this.length;
    },

    peek: function() {
        return this.str[this.position + 1];
    },

    next: function() {
        this.position++;
        return this.str[this.position];
    },

    rest: function() {
        return this.str.slice(this.position + 1);
    }

});

function isWhitespace(chr) {
    return chr == " " || chr == "\t" || chr == "\n";
}

function eatWhitespace(buf) {
    while (!buf.eof() && isWhitespace(buf.peek())) {
        buf.next();
    }
}

function parseExpr(expr) {
    var buf = new Buffer(expr);
    return parseParens(buf);
}

function parseNext(buf) {
    eatWhitespace(buf);

    switch (buf.peek()) {
    case "(":
        return parseParens(buf);
    default:
        return parseToken(buf);
    }
}

function parseParens(buf) {
    var list = [];

    eatWhitespace(buf);

    if (buf.next() != "(") {
        console.error("Parenthetical expression does start with an opening parenthesis");
    }

    while (!buf.eof() && buf.peek() != ")") {
        list.push(parseNext(buf));
    }

    if (buf.next() != ")") {
        console.error("Parenthetical expression does end with a closing parenthesis");
    }

    return list;
}

function parseToken(buf) {
    eatWhitespace(buf);

    var token = [];

    while (!buf.eof() && !isWhitespace(buf.peek()) && buf.peek() != ")") {
        token.push(buf.next());
    }

    eatWhitespace(buf);

    return token.join("");
}

function canSimplify(ast) {
    return ast instanceof Array && ast.length > 1;
}

function highlightDeepest(expr) {
    var ast = parseExpr(expr);
    return toExprString(ast, {
        highlightDeepest: true
    });
}

function simplifyDeepest(exprString) {
    var ast = parseExpr(exprString);
    var simplified = simplifyExpression(ast);
    var str = toExprString(simplified);

    if (str[0] != "(") {
        str = "(" + str + ")";
    }

    return str;
}

function simplifyExpression(ast) {
    if (ast instanceof Array) {
        if (isDeepest(ast)) {
            if (canSimplify(ast)) {
                return eval(toExprString(ast));
            } else {
                return ast;
            }
        } else {
            return _.map(ast, simplifyExpression);
        }
    } else {
        return ast;
    }
}

function isDeepest(exp) {
    return exp instanceof Array && !_.some(exp, function (item) {
        return item instanceof Array;
    });
}

function highlightExpression(expr, depth) {
    var color = expressionDepthColors[depth % expressionDepthColors.length];

    if (expr instanceof Array) {
        var strings = [];

        _.each(expr, function (item) {
            strings.push(highlightExpression(item, depth + 1));
        });

        str = "<span style='color: " + color + ";'>(" + strings.join(" ") + ")</span>";
    } else {
        str = expr;
    }

    return str;
}

function toExprString(expr, options) {
    options = $.extend({}, options);

    if (expr instanceof Array) {
        var strings = [];
        var deepest = isDeepest(expr);

        if (deepest && options.simplifyDeepest) {
            expr = simplifyExpression(expr);
            strings.push(toExprString(expr, options));
        } else {
            _.each(expr, function (item) {
                strings.push(toExprString(item, options));
            });
        }

        var exprString = strings.join(" ");
        var str = deepest && options.simplifyDeepest ? exprString : "(" + exprString + ")";

        if (deepest && options.highlightDeepest) {
            var color = options.simplifyDeepest ? KhanUtil.BLUE : KhanUtil.GREEN;
            str = "<span style='color: " + color + ";'>" + str + "</span>";
        }

        return str;
    } else {
        return expr;
    }
}

function removeOuterParentheses(expr) {
    if (expr[0] == "(" && expr[expr.length - 1] == ")") {
        return expr.slice(1, expr.length - 1);
    } else {
        return expr;
    }
}

$.extend(KhanUtil, {

    randomBoolean: function() {
        return KhanUtil.randFromArray([true, false]);
    },

    randomBooleanOperator: function() {
        return KhanUtil.randFromArray(["&&", "||"]);
    },

    simpleBooleanExpression: function(operator) {
        operator = operator || KhanUtil.randomBooleanOperator();
        return KhanUtil.randomBoolean() + " " + operator + " " + KhanUtil.randomBoolean();
    },

    complexBooleanExpression: function(depth) {
        var expression;

        if (depth === 0) {
            expression = KhanUtil.simpleBooleanExpression();
        } else if (KhanUtil.randRange(0, 1) === 0) {
            expression = KhanUtil.complexBooleanExpression(depth - KhanUtil.randRange(0, 1)) + " " +
                KhanUtil.randomBooleanOperator() + " " +
                KhanUtil.randomBoolean();
        } else {
            expression = KhanUtil.randomBoolean() + " " +
                KhanUtil.randomBooleanOperator() + " " +
                KhanUtil.complexBooleanExpression(depth - KhanUtil.randRange(0, 1));
        }

        return "(" + expression + ")";
    },

    buildSimplificationList: function(exprString) {
        var list = [];

        while (canSimplify(parseExpr(exprString))) {
            var expr = parseExpr(exprString);
            var simplified = simplifyDeepest(exprString);
            var simplifiedDisplayString = toExprString(expr, {
                simplifyDeepest: true,
                highlightDeepest: true
            });

            list.push({
                before: highlightDeepest(exprString),
                after: simplifiedDisplayString
            });

            exprString = simplified;
        }

        list.pop(); // remove the answer
        return list;
    },

    highlightExpression: function(exprString) {
        var expr = parseExpr(exprString);
        return highlightExpression(expr, 0);
    }

});

}());

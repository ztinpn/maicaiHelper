var TokenEOF = "TokenEOF";
var TokenChineseNum = "TokenChineseNum"; // 中文数字
var TokenComma = "TokenComma"; // 、
var TokenName = "TokenName"; // 中文
var TokenDigit = "TokenDigit"; // 数字
var TokenDot = "TokenDot";
var TokenColon = "TokenColon";
var TokenLeftBracket = "TokenLeftBracket";
var TokenRightBracket = "TokenRightBracket";
var TokenNewLine = "TokenNewLine";
var TokenWhiteSpace = "TokenWhiteSpace";

var stringToTokenTypeMap = {
    "[": TokenLeftBracket,
    "]": TokenRightBracket,
    ":": TokenColon,
    "：": TokenColon,
    "、": TokenComma,
    ".": TokenDot,
    "\n": TokenNewLine,
    " ": TokenWhiteSpace,
};

/*
    语法EBNF定义：
    <FoodInfo> ::= [{TokenNewLine}] {<FirstClass>} TokenEOF
    <FirstClass> ::= TokenChineseNum TokenComma TokenName {TokenNewLine} {<SecondClass>}
    <SecondClass> ::= TokenDigit TokenDot TokenName TokenColon {<SecondClassContent>}
                    | TokenDigit TokenDot [TokenName [TokenColon]] {TokenNewLine} // 允许没有内容，用来实现自动编号以及对应的染色，不影响。
    <SecondClassContent> ::= {TokenName} {TokenNewLine}
                            | {TokenLeftBracket [{TokenName}] TokenRightBracket} {TokenNewLine} // 中括号允许空，用来实现括号补全
    显然LL(3)
*/

// TokenName 定义为 [0-9.]且至少含有一个中文

// 其中，TokenChineseNum 先统一按TokenName解析，完了再单独判断

// className就取token的type
function createSpan(className, val, pos, parentClass, seen) {
    var span = document.createElement("span");
    span.classList.add(className);
    if (parentClass != null) {
        span.classList.add(parentClass.name);
    }
    if (seen) {
        span.classList.add("seen");
    }
    if (val === " ") {
        span.innerHTML = "&nbsp;";
    } else {
        span.innerText = val;
    }
    span.setAttribute("pos", pos);
    return span;
}

function tokens2HTMLEles(tokens) {
    return tokens.map(token => createSpan(token.type, token.val, token.pos, token.parentClass, token.seen || false));
}

class AST {
    parseFoodInfo() {
        this.ensureNotEnd();
        var token = this.getCurToken();
        while (token.type === TokenNewLine) {
            this.pos++;
            token = this.getCurToken();
        }
        var firstClassList = [];
        while (token.type !== TokenEOF) {
            firstClassList.push(this.parseFirstClass());
            token = this.getCurToken();
        }
        return new FoodInfo(firstClassList);
    }

    constructor(tokens) {
        this.tokens = tokens.filter(token => token.type !== TokenWhiteSpace); // 解析时排除空格
        this.pos = 0;
        this.root = this.parseFoodInfo();
    }

    err() {
        throw "err";
    }

    isEnd() {
        return this.pos >= this.tokens.length;
    }

    ensureNotEnd() {
        if (this.isEnd()) {
            this.err();
        }
    }

    getCurToken() {
        this.ensureNotEnd();
        return this.tokens[this.pos];
    }

    parseSecondClassContent(seenseenNameToTokenMapNames) {
        this.ensureNotEnd();
        var token = this.getCurToken();
        if (token.type === TokenName) {
            var names = [];
            while (token.type === TokenName) {
                if (token.val in seenseenNameToTokenMapNames) {
                    seenseenNameToTokenMapNames[token.val].seen = true;
                    token.seen = true;
                }
                seenseenNameToTokenMapNames[token.val] = token;
                names.push(token.val);
                this.pos++;
                if (this.isEnd()) {
                    this.err();
                }
                token = this.getCurToken();
            }
            if (token.type !== TokenNewLine) {
                this.err();
            }
            while (token.type === TokenNewLine) {
                this.pos++;
                token = this.getCurToken();
            }
            return new SecondClassContent(names, null);
        } else if (token.type === TokenLeftBracket) {
            var namesList = [];
            while (token.type === TokenLeftBracket) {
                var names = [];
                this.pos++;
                if (this.isEnd()) {
                    this.err();
                }
                token = this.getCurToken();
                if (token.type !== TokenName) { // 保证至少含一个
                    if (token.type === TokenRightBracket) {
                        this.pos++;
                        token = this.getCurToken();
                        break;
                    }
                    this.err();
                }
                while (token.type === TokenName) {
                    names.push(token.val);
                    token.parentClass = SecondClassContent;
                    this.pos++;
                    if (this.isEnd()) {
                        this.err();
                    }
                    token = this.getCurToken();
                }
                namesList.push(names);
                if (token.type !== TokenRightBracket) {
                    this.err();
                }
                this.pos++; // 跳过 TokenRightBracket
                token = this.getCurToken();
            }
            if (this.isEnd()) {
                this.err();
            }
            if (token.type !== TokenNewLine) {
                this.err();
            }
            while (token.type === TokenNewLine) {
                this.pos++;
                token = this.getCurToken();
            }
            return new SecondClassContent(null, namesList);
        } else {
            this.err();
        }
    }

    //     <SecondClass> ::= TokenDigit TokenDot TokenName TokenColon {<SecondClassContent>}
    //                     | TokenDigit TokenDot [TokenName [TokenColon]] {TokenNewLine} // 允许没有内容，用来实现自动编号以及对应的染色，不影响。
    parseSecondClass(id) {
        this.ensureNotEnd();
        var token = this.getCurToken();
        if (token.type !== TokenDigit) {
            this.err();
        }
        token.val = "" + id; // 重新编号
        this.pos++;
        token = this.getCurToken();
        if (token.type !== TokenDot) {
            this.err();
        }
        token.parentClass = SecondClass;
        this.pos++;
        token = this.getCurToken();
        if (token.type === TokenName) {
            // 继续就行
        } else if (token.type === TokenNewLine) {
            while (token.type === TokenNewLine) {
                this.pos++;
                token = this.getCurToken();
            }
            return null;
        } else {
            this.err();
        }

        // 有name
        var name = token.val;
        token.parentClass = SecondClass;
        this.pos++;
        token = this.getCurToken();
        token.parentClass = SecondClass;
        if (token.type === TokenColon) {
            // pass
        } else if (token.type === TokenNewLine) {
            while (token.type === TokenNewLine) {
                this.pos++;
                token = this.getCurToken();
            }
            return null;
        } else {
            this.err();
        }
        // 有colon
        this.pos++;
        token = this.getCurToken();
        var secondClassContent = [];
        var seenNameToTokenMap = {}; // name=>token
        while (token.type === TokenName || token.type === TokenLeftBracket) {
            // 续行的话进行合并
            var tmp = this.parseSecondClassContent(seenNameToTokenMap);
            secondClassContent = secondClassContent.concat(tmp.names || tmp.namesList);
            token = this.getCurToken();
        }
        return new SecondClass(name, secondClassContent);
    }

    parseFirstClass() {
        this.ensureNotEnd();
        var token = this.getCurToken();
        if (token.type !== TokenChineseNum) {
            this.err();
        }
        this.pos++;
        token = this.getCurToken();
        if (token.type !== TokenComma) {
            this.err();
        }
        this.pos++;
        token = this.getCurToken();
        if (token.type !== TokenName) {
            this.err();
        }
        var name = token.val;
        token.parentClass = FirstClass;
        this.pos++;
        token = this.getCurToken();
        if (token.type !== TokenNewLine) {
            this.err();
        }
        while (token.type === TokenNewLine) {
            this.pos++;
            token = this.getCurToken();
        }
        var secondClassList = [];
        var secondClassNumCnt = 1;
        token = this.getCurToken();
        while (token.type !== TokenChineseNum && token.type !== TokenEOF) {
            var secondClass = this.parseSecondClass(secondClassNumCnt++);
            secondClass && secondClassList.push(secondClass);
            token = this.getCurToken();
        }
        return new FirstClass(name, secondClassList);
    }
}

class FoodInfo {
    constructor(firstClassList) {
        this.firstClassList = firstClassList;
    }
}

class FirstClass {
    constructor(name, secondClassList) {
        this.name = name;
        this.secondClassList = secondClassList;
    }
}

class SecondClass {
    constructor(name, secondClassContent) {
        this.name = name;
        this.secondClassContent = secondClassContent;
    }
}

class SecondClassContent {
    constructor(names, namesList) {
        this.names = names; // 酱油 料酒 香菜 葱 洋葱 青椒 尖椒 姜 蒜
        this.namesList = namesList; // [葱 豆芽] [葱] [胡萝卜] [西红柿] [洋葱] [尖椒] [丝瓜]
    }
}

class Token {
    constructor(type, val, pos) {
        this.type = type; // 类型
        this.val = val; // 值
        this.pos = pos; // 在源码中的位置
    }
}

function isDigit(c) {
    var charCode = c.charCodeAt();
    if (charCode >= '0'.charCodeAt() && charCode <= '9'.charCodeAt()) {
        return true
    }
    return false
}

function isChineseNum(c) {
    return /^[一二三四五六七八九十]$/.test(c);
}

function isChineseOrMinus(c) {
    return /^[\u4e00-\u9fa5-a-zA-Z【】？。，]$/.test(c);
}

class Lexer {
    constructor(input) {
        this.input = input;
        this.start = 0; // 开始处理的位置
        this.pos = 0; // pos表示当前要处理的位置
    }

    err() {
        throw "err";
    }

    isEnd() {
        return this.pos >= this.input.length;
    }

    ensureNotEnd() {
        if (this.isEnd()) {
            this.err();
        }
    }

    getCurChar() {
        this.ensureNotEnd();
        return this.input[this.pos];
    }

    parstDigit() {
        var c = this.getCurChar();
        var val = "";
        var pos = this.pos;
        while (isDigit(c)) {
            val += c;
            this.pos++;
            if (this.isEnd()) {
                break;
            }
            c = this.getCurChar();
        }
        return new Token(TokenDigit, val, pos);
    }

    parseName() {
        var c = this.getCurChar();
        var val = "";
        var pos = this.pos;
        while (!this.isEnd() && isChineseOrMinus(c)) {
            val += c;
            this.pos++;
            if (this.isEnd()) {
                break;
            }
            c = this.getCurChar();
        }
        // 特别处理一下单独为汉字数字的情况
        if (isChineseNum(val)) {
            return new Token(TokenChineseNum, val, pos);
        }
        return new Token(TokenName, val, pos);
    }

    getNextToken() {
        // this.skipWhiteSpace();
        var pos = this.pos;
        if (this.isEnd()) {
            return new Token(TokenEOF, "", pos);
        }
        var c = this.getCurChar();
        if (c in stringToTokenTypeMap) {
            this.pos++;
            return new Token(stringToTokenTypeMap[c], c, pos);
        } else if (isDigit(c)) {
            return this.parstDigit();
        } else {
            return this.parseName();
        }
    }
}

function getTokens(code) {
    var lexer = new Lexer(code);
    var tokens = [];
    var token = null;
    while (!(token != null && token.type === TokenEOF)) {
        if (lexer.pos === code.length - 20) {
            console.log("xx");
        }
        token = lexer.getNextToken();
        tokens.push(token);
    }
    return tokens;
}

function parseFoodInfo(foodInfoContent) {
    var tokens = getTokens(foodInfoContent);
    var foodInfoNode = new AST(tokens).root;

    // 需要干两件事：
    // 1. 分组展开，例如"搭配做-汤类"指向了"组合菜品-汤类"，需要对后者进行展开。二层的subType
    // 2. 提取"调料"名称列表
    var firstClassName2SecondClassList = {} // 一级分类名称 => 对应的SecondClassList
    var secondClassName2SecondClass = {} // 二级分类名称 => 对应的SecondClass
    foodInfoNode.firstClassList.forEach(firstClass => {
        firstClassName2SecondClassList[firstClass.name] = firstClass.secondClassList;
        firstClass.secondClassList.forEach(secondClass => secondClassName2SecondClass[secondClass.name] = secondClass)
    });

    // 转一层，对外屏蔽AST节点的细节
    function secondClass2NameListMap(secondClass) {
        if (secondClass == null) {
            return null;
        }
        return {
            name: secondClass.name,
            list: secondClass.secondClassContent,
        }
    }

    var groups = firstClassName2SecondClassList["分组展示"]; // groups的类型为SecondClassList
    var expandedGroups = []; // 分组展开，例如"搭配做-汤类"指向了"组合菜品-汤类"，需要对后者进行展开。二层的subType
    groups.forEach(secondClass => {
        if (secondClass.secondClassContent.length === 1 && secondClass.secondClassContent[0] in firstClassName2SecondClassList) {
            // 只有一个且在一级分类中，说明是组合菜品，直接用firstClassName2SecondClassList即可
            expandedGroups.push({
                name: secondClass.name,
                list: firstClassName2SecondClassList[secondClass.secondClassContent[0]].map(secondClass2NameListMap)
            });
        } else {
            // 二级分类，用secondClass2NameListMap展开
            expandedGroups.push({
                name: secondClass.name,
                list: secondClass.secondClassContent.map(name => secondClass2NameListMap(secondClassName2SecondClass[name])).filter(x => x != null)
            });
        }
    })

    return {
        groups: expandedGroups,
        condimentNames: new Set(secondClassName2SecondClass["调料"].secondClassContent),
    };
}
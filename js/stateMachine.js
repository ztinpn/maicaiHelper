class State {
    static cnt = 0

    constructor(val) {
        this.val = val;
        this.cnt = State.cnt++; // 用来唯一区分状态
    }

    toString() { // 方便作为key标记唯一性
        return "State" + this.cnt;
    }
}

class StateMachine {
    static START = new State("START")
    // S->A1->A2->...->An(Accept)
    // 当前状态为Ai时，如果输入字符不是A_{i+1}，则转到S
    constructor(seq) {
        if (seq === null || seq.length === 0) {
            throw "err";
        }
        // 统一转大写
        this.seq = seq.toUpperCase().split("");

        // 已输入的合法序列，是seq的从0位置开始的子串
        this.validInputed = [];

        // 开始状态
        this.state = StateMachine.START;

        // 所有状态序列
        var fullSeq = [StateMachine.START];
        this.seq.forEach(ele => fullSeq.push(new State(ele)));
        this.table = {} // [状态,输入] => 下一个状态，查不到则跳开始
        for (var i = 0; i < fullSeq.length - 1; i++) {
            var cur = fullSeq[i];
            var next = fullSeq[i + 1];
            this.table[this.calTableKey(cur, next.val)] = next;
        }
        this.ACCEPT = fullSeq[fullSeq.length - 1];// 最后一个状态为接受状态
    }

    isInAccpetState() {
        return this.state === this.ACCEPT;
    }

    calTableKey(state, input) {
        return state.toString() + "|" + input;
    }

    input(c) {
        c = c.toUpperCase();
        var key = this.calTableKey(this.state, c);
        if (key in this.table) {
            // 说明基于当前的状态|当前输入，有对应的有效状态
            this.state = this.table[key];
            this.validInputed.push(c);
        } else {
            // 无对应的有效状态，那么跳开始状态
            this.reset();
        }
    }

    reset() {
        this.state = StateMachine.START;
        this.validInputed = [];
    }

    getValidInputed() {
        return this.validInputed;
    }
}
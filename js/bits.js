class Bits {
    static Width = 32; // 每个数字存储的最大位长度
    static onePosMap = {}; // key为只含一个1的二进制数，val为这个1的位置，用来O(1)获取位置
    static inited; // 是否已经初始化过了

    static init() {
        for (var i = 0; i < Bits.Width; i++) {
            Bits.onePosMap[1 << i] = i;
        }
    }

    constructor(bitsSize, arr) {
        if (bitsSize <= 0) {
            throw "err";
        }
        if (!Bits.inited) {
            Bits.init();
        }
        this.bitsSize = bitsSize; // 位长度
        this.int32size = Math.ceil(this.bitsSize / Bits.Width); // 需要存多少个数字。比如，期望100位，只需要存4个数字就能表达。
        if (arr == null) {
            // 不传入arr时新建
            this.arr = new Array(this.int32size); // 0, 1, ..., int32size 个元素分别表示[31-0] [63-32] ... [int32size*32+31-int32size*32]位
            this.arr.fill(0); // 初始化为0
        } else {
            // 传入时直接设置，方便位操作之后生成新的Bits对象，来支持链式操作
            this.arr = arr;
        }
    }


    lowbit(x) {
        // 非负整数x在二进制表示下最低位的1以及后面0组成的数值
        // 例如: x=11，对应 0001010，那么lowbit(x)会得到 0000010
        return x & -x;
    }

    // 获取所有1的位置
    getOnePosList() {
        var ret = [];
        this.arr.forEach((x, idx) => {
            while (x !== 0) {
                // 每次循环获取最低位1的位置
                var tmp = this.lowbit(x);
                ret.push(Bits.onePosMap[tmp] + Bits.Width * idx);
                x = x - tmp;
            }
        });
        return ret;
    }

    set(idx) {
        // 设置第idx位为1
        if (idx < 0 || idx > this.bitsSize) {
            throw "err";
        }
        var bucketIdx = Math.floor(idx / Bits.Width);
        this.arr[bucketIdx] |= 1 << (idx % Bits.Width)
    }

    clear(idx) {
        // 设置第idx位为0
        if (idx < 0 || idx > this.bitsSize) {
            throw "err";
        }
        var bucketIdx = Math.floor(idx / Bits.Width);
        this.arr[bucketIdx] &= ~(1 << (idx % Bits.Width));
    }

    op(other, opFun) {
        if (other == null || !(other instanceof Bits)) {
            throw "err";
        }
        if (other.bitsSize !== this.bitsSize) {
            throw "err";
        }
        return new Bits(this.bitsSize, this.arr.map((item, idx) => opFun(item, other.arr[idx])));
    }

    xor(other) {
        return this.op(other, (a, b) => a ^ b)
    }

    or(other) {
        return this.op(other, (a, b) => a | b)
    }

    and(other) {
        return this.op(other, (a, b) => a & b)
    }
}

// 测试Bits
// var a = new Bits(100);
// var expectPos = [1,3,5,31,32, 45,69,99];
// expectPos.forEach(pos=>a.set(pos));
// a.clear(45);
// a.clear(69);
// var actualPos = a.getOnePosList();
// var isEqual = JSON.stringify([1,3,5,31,32,99]) === JSON.stringify(actualPos);
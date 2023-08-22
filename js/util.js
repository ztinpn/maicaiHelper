function repeatChar(cnt, c) {
    return new Array(cnt).fill(c).join("");
}

// 集合减法
function sub(a, b) {
    var ret = new Set();
    for (var k of a) {
        if (!b.has(k)) {
            ret.add(k);
        }
    }
    return ret;
}

function splitListInBatch(lst, batchSize) {
    var ret = [];
    lst.forEach((x, idx) => {
        if (idx % batchSize === 0) {
            ret.push([]);
        }
        ret[ret.length - 1].push(x);
    });
    return ret;
}

function show(eles) {
    eles.forEach(ele => {
        ele.style.zIndex = 0;
        ele.style.opacity = "1";
    })
}

function hide(eles) {
    eles.forEach(ele => {
        ele.style.zIndex = -1; // 不然歌词会挡住菜单。不能用display none，因为这样的话"transition: opacity"就无效了
        ele.style.opacity = "0";
    })
}

function toggleByOpacity(eles) {
    eles.forEach(ele => {
        if (ele.style.opacity === "0") {
            show([ele]);
        } else {
            hide([ele]);
        }
    });
}

function isVisibleByOpacity(ele) {
    return ele.style.opacity !== "0";
}
function isVisibleByDisplay(ele) {
    return ele.style.display !== "none";
}
function toggleByDisplay(eles) {
    eles.forEach(ele => {
        ele.style.display = ele.style.display==="none"?"block":"none";
    });
}

function hideByDisplay(eles) {
    eles.forEach(ele => {
        ele.style.display = "none";
    });
}
function showByDisplay(eles) {
    eles.forEach(ele => {
        ele.style.display = "block";
    });
}

function getFoodInfoRawOrDefault(defaultVal) {
    var val = localStorage.getItem("foodInfoRaw")
    if (val==null || val.replace(/\s/g,"").length===0) {
        return defaultVal;
    } else{
        return val;
    }

}

function setFoodInfoRaw(val) {
    return localStorage.setItem("foodInfoRaw", val);
}
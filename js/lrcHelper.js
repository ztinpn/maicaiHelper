function createLRCHelper(lrcRaw) {
    var rainingStartAtInSec = null; // 啥时候开始下雨
    var rainingEndAtInSec = null; // 啥时候结束下雨
    function parseLRC(raw) {
        var lines = raw.split("\n");
        var offset = parseFloat(lines[0].match(/(-?\d+)/)[1]); // 整体的偏移
        var ret = [];
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i];
            var matchRes = line.match(/^\[(\d+):([\d.]+)([+-][0-9.]+)?](.*?)(\[.+\])?$/);
            // 分钟*60+秒+单独的偏移+整体偏移
            var timeInSec = parseInt(matchRes[1]) * 60 + parseFloat(matchRes[2]) + (matchRes[3] == null ? 0 : parseFloat(matchRes[3])) + offset;
            var content = matchRes[4];
            if (ret.length > 0) {
                ret[ret.length - 1]["to"] = timeInSec;
            }
            if (matchRes[5] === "[startRain]") {
                rainingStartAtInSec = timeInSec;
            }
            if (matchRes[5] === "[endRain]") {
                rainingEndAtInSec = timeInSec;
            }
            ret.push({
                content: content,
                from: timeInSec,
            })
        }
        ret[ret.length - 1].to = ret[ret.length - 1].from;
        return ret;
    }

    var lrcItems = parseLRC(lrcRaw);
    var totalTimeInSec = lrcItems[lrcItems.length - 1].to - lrcItems[0].from;
    var sampleTimeInMillisec = 50; // 采样时间 ms

    // timeIndexes的第i位表示 时间段[i*sampleTimeInMillisec, (i+1)*sampleTimeInMillisec) 期间对应的lrcItems的下标
    var timeIndexes = new Array(Math.floor(totalTimeInSec * 1000 / sampleTimeInMillisec)).fill(0);
    var curIdxOfTimeIndexes = 0; // [curIdxOfTimeIndexes, timeIndexes.length-1]表示等待处理的区间
    lrcItems.forEach((lrcItem, idx) => {
        var fromTime = lrcItem.from;
        var toTime = lrcItem.to;
        while (curIdxOfTimeIndexes * sampleTimeInMillisec >= fromTime * 1000
        && curIdxOfTimeIndexes * sampleTimeInMillisec < toTime * 1000) {
            if (curIdxOfTimeIndexes <= timeIndexes.length - 1) {
                timeIndexes[curIdxOfTimeIndexes] = idx;
            }
            curIdxOfTimeIndexes++;
        }
    });
    while (curIdxOfTimeIndexes <= timeIndexes.length - 1) {
        timeIndexes[curIdxOfTimeIndexes] = lrcItems.length - 1;
        curIdxOfTimeIndexes++;
    }

    // 根据当前时间计算出当前时刻需要展示的歌词内容
    // curTime为播放器提供的开始时间，所以需要做一下播放器和场景的同步
    function getCurLRCContent(curTime) {
        var idx = Math.floor(curTime * 1000 / sampleTimeInMillisec);
        if (idx > timeIndexes.length - 1) { // 防止越界
            return "";
        }
        return lrcItems[timeIndexes[idx]].content;
    }

    return {
        getCurLRCContent: getCurLRCContent,
        rainingStartAtInSec: rainingStartAtInSec,
        rainingEndAtInSec: rainingEndAtInSec,
    }
}
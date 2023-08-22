function createAnimationController(lrcHelper) {
    // 时间配置
    var dropDurationInSec = 0.6; // 多少s从顶部到底部
    var sprayDruationInSec = 0.4; // 水花持续时间
    var rippleDurationInSec = 1; // 波纹持续时间
    var createBatchRainDropEveryXSec = 0.1; // 每多少秒产生一批水滴
    // 每 createBatchRainDropEveryXSec 产生在[batchRainDropSizeMin, batchRainDropSizeMax]范围内均匀分布的个水滴
    var batchRainDropSizeMin = 100;
    var batchRainDropSizeMax = batchRainDropSizeMin * 2;

    // 尺度配置，随window大小动态变化，这里先声明下变量
    // 水滴
    var dropHeight; // 高度
    var dropWidth; // 宽度
    var dropGroundMin; // 下落最低高度
    var dropGroundMax; // 下落最大高度
    // 水花
    var sprayInitialRX; // x方向半径
    var sprayInitialRY; // y方向半径
    // 波纹
    var rippleInitialRX; // x方向半径
    var rippleInitialRY;// y方向半径

    // window.devicePixelRatio相关计算是为了适配高分辨率的屏幕
    var WIDTH = window.innerWidth * window.devicePixelRatio;
    var HEIGHT = window.innerHeight * window.devicePixelRatio;
    var canvas = document.getElementById("canvas");
    canvas.style.zoom = 1 / window.devicePixelRatio;

    var ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    (window.onresize = function () {
        // 长宽更新
        WIDTH = canvas.width = window.innerWidth * window.devicePixelRatio;
        HEIGHT = canvas.height = window.innerHeight * window.devicePixelRatio;

        // 尺度更新
        setSize();

        // 歌词字体配置
        ctx.font = "" + Math.floor(WIDTH / 30) + "px YanShiYouRanXiaoKai";
        ctx.fillText("", 0, 0);// 用来载入防止抖动的，不然会先展示为默认字体，然后闪现为载入的字体
    })();

    function setSize() {
        // 水滴
        dropHeight = HEIGHT / 30; // 高度
        dropWidth = dropHeight / 10; // 宽度
        dropGroundMin = 0.6 * HEIGHT; // 下落最低高度
        dropGroundMax = HEIGHT; // 下落最大高度

        // 水花
        sprayInitialRX = dropWidth; // x方向半径
        sprayInitialRY = sprayInitialRX / 3; // y方向半径

        // 波纹
        rippleInitialRX = HEIGHT / 20; // x方向半径
        rippleInitialRY = rippleInitialRX / 4;// y方向半径
    }

    // 颜色配置
    var dropFillStyle = "rgb(222,236,255)";

    // 用来保持水滴、水花、波纹三者颜色一样，但是透明度不同
    function addAlphaBasedOnDropFillStyle(alpha) {
        return dropFillStyle.replace("rgb", "rgba").replace(")", "," + alpha + ")");
    }

    // 运行时数据
    var rainDrops = [];// 雨滴
    var sprays = []; // 水花
    var ripples = []; // 波纹

    // 设置文字，并返回文字文字顶部的边界，用来实现碰撞检测
    function fillAndGetContentTopOutlinePoints(content) {
        if (content === "") {
            return {};
        }
        var measureText = ctx.measureText(content);
        var textHeight = measureText.actualBoundingBoxAscent + measureText.actualBoundingBoxDescent;
        var textY = HEIGHT / 2 + textHeight / 2;
        ctx.fillText(content, WIDTH / 2, textY);
        // 此时，文字分布在：
        // measureText.width X textHeight 的区间内
        // 我们通过扫描这个区域的像素，来得到文字顶部的边界
        var ret = {};
        var imgDataX = Math.floor(WIDTH / 2 - measureText.width / 2);
        var imgDataY = Math.floor(HEIGHT / 2 - textHeight / 2);
        var imgDataW = Math.floor(measureText.width);
        var imgDataH = Math.floor(textHeight);
        var imgData = ctx.getImageData(imgDataX, imgDataY, imgDataW, imgDataH).data;
        for (var x = 0; x < imgDataW; x++) {
            for (var y = 0; y < imgDataH; y++) {
                var idx = (y * imgDataW + x) * 4;
                var alpha = imgData[idx + 3];
                if (alpha !== 0) {
                    ret[imgDataX + x] = imgDataY + y;
                    break;
                }
            }
        }
        return ret;
    }

    // 文字顶部的y位置
    var contentTopOutlinePoints = {}; // map[x] = y，有个坑：使用的时候，x需要转parseInt

    function render(lrcContent) {
        // 清空画布
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // lrc
        ctx.save();
        ctx.beginPath();
        ctx.textBaseline = "ideographic"; // 方便实现中文的垂直居中
        ctx.textAlign = "center";
        contentTopOutlinePoints = fillAndGetContentTopOutlinePoints(lrcContent);
        ctx.restore();

        // 雨滴
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 0;
        ctx.fillStyle = dropFillStyle;
        var h = dropHeight / 0.75;
        var w = dropWidth / 0.2886751;
        rainDrops.forEach(drop => {
            var x = drop.x;
            var y = drop.y;
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x - w / 2, y + h, x + w / 2, y + h, x, y);
        });
        ctx.fill();
        ctx.restore();

        // 水花
        ctx.save();
        ctx.lineWidth = 0;
        sprays.forEach(spray => {
            var x = spray.x;
            var y = spray.y;
            var rx = spray.rx;
            var ry = spray.ry;
            var alpha = spray.alpha;
            ctx.beginPath();
            // 按照速度矢量和地面的夹角，去确定椭圆的方向，使得椭圆长轴方向就是速度矢量的方向
            var ang = Math.atan2(spray.vy, spray.vx);
            ctx.ellipse(x, y, rx, ry, ang, 0, 2 * Math.PI);
            ctx.fillStyle = addAlphaBasedOnDropFillStyle(alpha);
            ctx.fill();
        })
        ctx.restore();

        // 波纹
        ctx.save();
        ctx.lineWidth = 1;
        ripples.forEach(ripple => {
            var x = ripple.x;
            var y = ripple.y;
            var rx = ripple.rx;
            var ry = ripple.ry;
            var alpha = ripple.alpha;
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
            ctx.strokeStyle = addAlphaBasedOnDropFillStyle(alpha);
            ctx.stroke();
        })
        ctx.restore();
    }

    // 上次执行update的时间，用来判断本次执行时是否要创建水滴
    var lastTime = new Date();

    function update(shouldCreateNewRain, playerCurrentTime, rainingDurationEndAtInSec, endingDelayInSec) {
        var now = new Date();
        var createNumRatio = 1;
        if (playerCurrentTime > rainingDurationEndAtInSec) {
            // 线性减少
            createNumRatio = Math.max(0, 1 - (playerCurrentTime - rainingDurationEndAtInSec) / endingDelayInSec);
        }
        if (shouldCreateNewRain) {
            if (now - lastTime > createBatchRainDropEveryXSec * 1000) {
                lastTime = now;
                var createNum = Math.round(createNumRatio * randomInt(batchRainDropSizeMin, batchRainDropSizeMax));
                for (var i = 0; i < createNum; i++) {
                    var vyToMinGround = dropGroundMin / dropDurationInSec; // 下落到dropGroundMin的时间

                    rainDrops.push({
                        t: now,

                        // 水平方向均匀分布
                        x0: randomInt(0, WIDTH),

                        // y0非0，而是一个向上的随机偏移量，防止同时产生等高的一堆雨滴，显得不自然
                        // 由于每createBatchRainDropEveryXSec产生一批雨滴，那么：
                        //     vyToMinGround * createBatchRainDropEveryXSec就是产生间隔内移动的距离
                        // 再加个[0,1)的系数，即可实现雨水均匀随机下落的效果
                        y0: -Math.random() * vyToMinGround * createBatchRainDropEveryXSec,

                        // 加个[0.6,1）的随机系数，使得雨滴竖直速度各不相同
                        vy: (0.6 + Math.random() * (1 - 0.6)) * vyToMinGround,

                        // 总共移动 500分之一的宽度，再带上(-1,1)的随机系数，实现左右轻微摆动的效果
                        vx: (1 - 2 * Math.random()) * WIDTH / 500 / dropDurationInSec,

                        // 地面的高度
                        groundY: randomInt(dropGroundMin, dropGroundMax),
                    });
                }
            }
        }

        // 计算水滴最多可能下落到的Y位置，以及这个位置是否因为碰撞了文字导致。如果碰撞了文字，有水花即可，不必产生波纹
        function calLimitYAndIsHitWord(drop) {
            var limitY = drop.groundY;
            var contentY = contentTopOutlinePoints[Math.round(drop.x)];
            var isHitWord = false;
            if (contentY != null && contentY < limitY) {
                limitY = contentY;
                isHitWord = true;
            }
            return {
                limitY: limitY,
                isHitWord: isHitWord,
            }
        }

        // 水滴的位置更新
        rainDrops.forEach(drop => {
            var t = (now - drop.t) / 1000; // 单位:s
            drop.y = drop.y0 + t * drop.vy; // 匀速下降，反正很快，加速度没意义。
            drop.x = drop.x0 + t * drop.vx;
            var limitYAndIsHitWord = calLimitYAndIsHitWord(drop);
            var shouldCreateSprays = false;
            if (drop.y + dropHeight >= limitYAndIsHitWord.limitY) {
                if (limitYAndIsHitWord.isHitWord) {
                    // 碰到歌词，需要有个保护区，不然变化歌词的时候，恰好落在歌词内部的部分会有弹起的效果，不好看
                    shouldCreateSprays = drop.y + dropHeight - limitYAndIsHitWord.limitY < 5 * window.devicePixelRatio; // 5像素以内需要造水花，否则直接下落就好（下落之后会在碰到底部时产生水花）
                } else {
                    // 碰到底部，无脑产生水花
                    shouldCreateSprays = true;
                }
            }
            if (shouldCreateSprays) {
                // 水花
                // 一滴雨水，可能产生2~4个水花
                var vxsRatios = { // x方向速度的比例
                    2: [-1, 1],
                    3: [-1, 0, 1],
                    4: [-1, -0.33, 0.33, 1],
                }
                var n = randomInt(2, 4);
                var vxRatios = vxsRatios[n];
                for (var i = 0; i <= n; i++) {
                    sprays.push({
                        x0: drop.x,
                        y0: drop.y + dropHeight,
                        vx0: (0.3 + Math.random() * 0.7) * WIDTH / 50 / sprayDruationInSec * vxRatios[i],
                        vy0: -2 * WIDTH / 50 / sprayDruationInSec,
                        t: now, // 创建时间
                    });
                }

                // 波纹
                if (!limitYAndIsHitWord.isHitWord) {// 文字不产生波纹
                    ripples.push({
                        x0: drop.x,
                        y0: drop.y + dropHeight,
                        t: now,// 创建时间
                    });
                }
            }
        });

        ripples.forEach(ripple => {
            var t = (now - ripple.t) / 1000; // s
            var normalizedT = Math.max(0, t / rippleDurationInSec);
            var slowNormalizedT = Math.pow(1 - normalizedT, 0.1); // 缓变
            ripple.x = ripple.x0;
            ripple.y = ripple.y0;
            ripple.rx = rippleInitialRX * normalizedT;
            ripple.ry = rippleInitialRY * normalizedT;
            ripple.alpha = slowNormalizedT / 2;
        });

        sprays.forEach(spray => {
            // 保证水花升起后落下到刚升起时的高度，需要满足在 sprayDruationInSec 内，y变成y0
            // 也就是 t*spray.vy + 0.5 * t * t * sprayG = 0
            // 于是有 sprayG = -spray.vy0 / 0.5 / sprayDruationInSec
            var sprayG = -spray.vy0 / 0.5 / sprayDruationInSec;
            var t = (now - spray.t) / 1000; // s
            spray.vx = spray.vx0;
            spray.vy = spray.vy0 + t * sprayG;
            spray.x = spray.x0 + t * spray.vx0;
            spray.y = spray.y0 + t * spray.vy0 + 0.5 * t * t * sprayG;

            var normalizedT = t / sprayDruationInSec;
            var slowNormalizedT = Math.pow(1 - normalizedT, 0.1); // 缓变
            spray.rx = sprayInitialRX * slowNormalizedT;
            spray.ry = sprayInitialRY * slowNormalizedT;
            spray.alpha = slowNormalizedT;
        });

        // 删除
        rainDrops = rainDrops.filter(drop => drop.y + dropHeight <= calLimitYAndIsHitWord(drop).limitY);
        sprays = sprays.filter(spray => now - spray.t <= sprayDruationInSec * 1000);
        ripples = ripples.filter(ripple => ripple.rx <= rippleInitialRX);
    }

    // [from, to]
    function randomInt(from, to) {
        from = Math.floor(from);
        to = Math.floor(to);
        return Math.floor(Math.random() * (to + 1 - from)) + from;
    }

    return {
        start: function (bgMusicEle, endingDelayInSec, endHook) {
            bgMusicEle.play();
            var musicStartedAtInSec = new Date().valueOf() / 1000;
            var isMusicEnded = false;
            bgMusicEle.addEventListener('ended', function () {
                isMusicEnded = true;
            });

            // 由于歌曲结束了之后，动画还可能在执行，需要对获取当前已播放时间的逻辑进行调整：
            // 1. 播放未结束 => 用bgMusicEle.currentTime
            // 2. 播放已结束 => now - musicStartedAtInSec
            // 已播放时间是用来作为动画执行到哪的参考，如果不进行调整，播放完的时候画面里还一堆雨水就静止了
            function getDurationInSecAfterPlay() {
                if (!isMusicEnded) {
                    return bgMusicEle.currentTime;
                }
                return new Date().valueOf() / 1000 - musicStartedAtInSec;
            }

            function loop() {
                // 4个阶段：
                // 0:[0,下雨开始): 不产生雨水，正常动画循环
                // 1:[下雨开始, 下雨预停止): 正常数量产生雨水，正常动画循环
                // 2:[下雨预停止,下雨停止): 按时间衰减产生雨水，正常动画循环 => 实现雨水慢慢减少的效果
                // 3:[下雨停止,end)：不产生新雨水，等所有存量雨水消失了再end
                var stage = null;
                var playerCurrentTime = getDurationInSecAfterPlay();
                var rainingStartAtInSec = lrcHelper.rainingStartAtInSec;
                var rainingEndAtInSec = lrcHelper.rainingEndAtInSec;
                if (playerCurrentTime < rainingStartAtInSec) {
                    stage = 0;
                } else if (playerCurrentTime >= rainingStartAtInSec && playerCurrentTime < rainingEndAtInSec) {
                    stage = 1;
                } else if (playerCurrentTime >= rainingEndAtInSec && playerCurrentTime < rainingEndAtInSec + endingDelayInSec) {
                    stage = 2;
                } else {
                    stage = 3;
                }
                var shouldCreateNewRain = [1, 2].includes(stage);
                if (stage === 3 && (rainDrops.length + sprays.length + ripples.length) === 0) {
                    // 阶段3且雨水全部消失
                    endHook();
                    return;
                }
                update(shouldCreateNewRain, playerCurrentTime, rainingEndAtInSec, endingDelayInSec);
                var lrcContent = lrcHelper.getCurLRCContent(playerCurrentTime);
                render(lrcContent); // 渲染
                requestAnimationFrame(loop);
            }

            requestAnimationFrame(loop);
        },
    }
}
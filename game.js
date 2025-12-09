// ==================================
// GLOBAL
// ==================================
let player, cursors, restartKey;
let bg, ground;
let fishGroup, spikeGroup;

let score = 0;
let highScore = Number(localStorage.getItem("penguinHighScore") || 0);
let scoreText, highScoreText, infoText;
let gameOver = false;

let gameSpeed = 220;  // 기본 이동 속도
let groundTopY = 0;   // 바닥 윗면 y (가시/물고기 위치 맞추기용)


// ==================================
// PHASER CONFIG
// ==================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: "arcade",
        arcade: { gravity: { y: 900 }, debug: false }
    },
    scene: { preload, create, update }
};

new Phaser.Game(config);


// ==================================
//  PRELOAD ASSETS
// ==================================
function preload() {
    this.load.image("sky",    "assets/sky.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("fish",   "assets/star.png");
    this.load.image("spike",  "assets/bomb.png");
    this.load.image("penguin","assets/dude.png");
}


// ==================================
// CREATE SCENE
// ==================================
function create() {

    // --- 배경 (스크롤용) ---
    bg = this.add.tileSprite(400, 300, 800, 600, "sky");

    // --- 바닥 (고정, 충돌용) ---
    // 화면 아래쪽에 딱 붙게 y=560 정도로 배치
    ground = this.physics.add.staticImage(400, 560, "ground");
    ground.setScale(0.8);
    ground.refreshBody();
    ground.setDepth(1);  // 펭귄보다 뒤에

    // 바닥 윗면 위치 계산해서 저장
    groundTopY = ground.y - ground.displayHeight / 2;

    // --- 펭귄 ---
    // 바닥 윗면보다 위쪽에 살짝 배치
    player = this.physics.add.sprite(140, groundTopY - 70, "penguin");
    player.setScale(0.22);
    player.setCollideWorldBounds(true);
    player.setDepth(2);  // ground보다 앞에 보이게

    // 히트박스 정밀 조정
    player.body
        .setSize(player.width * 0.45, player.height * 0.75)
        .setOffset(player.width * 0.3, player.height * 0.25);

    // --- 입력 ---
    cursors    = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // --- 그룹 ---
    fishGroup  = this.physics.add.group();
    spikeGroup = this.physics.add.group();

    // --- UI 텍스트 ---
    scoreText = this.add.text(16, 16, "점수: 0", {
        fontSize: "28px",
        fill: "#ffffff"
    });

    highScoreText = this.add.text(16, 48, `최고 기록: ${highScore}`, {
        fontSize: "22px",
        fill: "#ffffaa"
    });

    infoText = this.add.text(
        16,
        80,
        "↑ 또는 SPACE = 점프   |   R = 재시작",
        { fontSize: "18px", fill: "#ffffff" }
    );

    // --- 물리 충돌 & 겹침 ---
    this.physics.add.collider(player, ground); // 펭귄-바닥 충돌

    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.overlap(player, spikeGroup, hitSpike,   null, this);

    // --- 주기적 생성 ---
    this.time.addEvent({
        delay: 2400,           // 물고기 생성 간격
        callback: spawnFish,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 3000,           // 얼음가시 생성 간격
        callback: spawnSpike,
        callbackScope: this,
        loop: true
    });

    // --- 난이도 (속도 증가) ---
    this.time.addEvent({
        delay: 9000,
        callback: () => (gameSpeed += 50),
        loop: true
    });
}


// ==================================
// UPDATE
// ==================================
function update(time, delta) {
    const dt = delta / 1000;

    if (gameOver) {
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            // 재시작
            score = 0;
            gameSpeed = 220;
            gameOver = false;
            this.scene.restart();
        }
        return;
    }

    // 배경만 스크롤 (바닥은 고정)
    bg.tilePositionX += gameSpeed * dt;

    // 펭귄은 제자리 (x속도 0)
    player.setVelocityX(0);

    // 점프 (바닥에 닿았을 때만)
    const isJumpKey = cursors.up.isDown || cursors.space.isDown;
    if (isJumpKey && (player.body.blocked.down || player.body.touching.down)) {
        player.setVelocityY(-460);
    }

    // 시간에 따라 점수 증가
    score += 10 * dt;
    scoreText.setText("점수: " + Math.floor(score));

    // 화면 밖으로 나간 오브젝트 제거
    cleanupGroup(fishGroup);
    cleanupGroup(spikeGroup);
}



// ==================================
// OBJECT SPAWN
// ==================================

// 물고기는 바닥 위 살짝 위쪽 랜덤
function spawnFish() {
    if (gameOver) return;

    const minY = groundTopY - 180;
    const maxY = groundTopY - 80;
    const y = Phaser.Math.Between(minY, maxY);

    const fish = fishGroup.create(860, y, "fish");
    fish.setScale(0.1);
    fish.setVelocityX(-gameSpeed);
    fish.body.allowGravity = false;
    fish.setDepth(2);
}

// 얼음 가시는 바닥에 딱 붙이기
function spawnSpike() {
    if (gameOver) return;

    const spike = spikeGroup.create(860, groundTopY, "spike");
    spike.setScale(0.18);
    spike.setVelocityX(-gameSpeed);
    spike.body.allowGravity = false;
    spike.setOrigin(0.5, 1);  // 아래쪽이 groundTopY에 닿도록
    spike.setDepth(2);
}



// ==================================
// COLLISION HANDLERS
// ==================================
function collectFish(player, fish) {
    fish.destroy();
    score += 20; // 보너스
}

function hitSpike(player, spike) {
    if (gameOver) return;

    gameOver = true;
    player.setTint(0xff0000);

    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem("penguinHighScore", highScore);
    }

    scoreText.setText("❌ GAME OVER | R 누르면 재시작");
    highScoreText.setText(`최고 기록: ${highScore}`);
}


// ==================================
// HELPER
// ==================================
function cleanupGroup(group) {
    group.children.iterate(obj => {
        if (obj && obj.x < -80) obj.destroy();
    });
}

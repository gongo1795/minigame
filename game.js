// ==================================
// GLOBAL
// ==================================
let player, cursors, restartKey;
let bg, ground, groundCollider;
let fishGroup, spikeGroup;

let score = 0;
let highScore = Number(localStorage.getItem("penguinHighScore") || 0);
let scoreText, highScoreText, infoText;
let gameOver = false;

let gameSpeed = 220;   // 기본 이동 속도
let groundTopY = 0;    // 바닥 윗면 y

let fishY = 0;         // 물고기 고정 y
let spikeY = 0;        // 얼음 결정 고정 y

const FISH_OFFSET = -60; // 펭귄 기준 물고기 위치
const SPIKE_OFFSET = 5; // 펭귄 기준 얼음 결정 위치


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
// PRELOAD
// ==================================
function preload() {
    this.load.image("sky",    "assets/sky.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("fish",   "assets/star.png");
    this.load.image("spike",  "assets/bomb.png");
    this.load.image("penguin","assets/dude.png");
}


// ==================================
// CREATE
// ==================================
function create() {

    // --- 배경 (스크롤용) ---
    bg = this.add.tileSprite(400, 300, 800, 600, "sky");

    // ============================
    // 1) 충돌용 바닥 (보이지 않는 판)
    // ============================
    groundCollider = this.physics.add.staticImage(400, 460, "ground");
    groundCollider.setScale(0.4);
    groundCollider.refreshBody();
    groundCollider.setVisible(false);
    groundTopY = groundCollider.y - groundCollider.displayHeight / 2;

    // ============================
    // 2) 보이는 바닥 (아래쪽은 잘려도 됨)
    // ============================
    ground = this.add.image(400, 0, "ground");
    ground.setScale(1.4);
    ground.setDepth(1);

    // --- 펭귄 ---
    player = this.physics.add.sprite(140, groundTopY - 8, "penguin");
    player.setScale(0.22);
    player.setDepth(2);
    player.setCollideWorldBounds(true);

    // 바닥 위치를 펭귄 기준으로 아래로 내리기
    ground.y = player.y + 200;

    // 물고기 / 얼음 결정 고정 y 계산 (한 번만)
    fishY  = player.y + FISH_OFFSET;
    spikeY = player.y + SPIKE_OFFSET;

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
    this.physics.add.collider(player, groundCollider);

    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.overlap(player, spikeGroup, hitSpike,   null, this);

    // --- 오브젝트 생성 타이머 ---
    this.time.addEvent({
        delay: 2400,
        callback: spawnFish,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 3000,
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

    // 점수 증가
    score += 10 * dt;
    scoreText.setText("점수: " + Math.floor(score));

    // 화면 밖으로 나간 오브젝트 제거
    cleanupGroup(fishGroup);
    cleanupGroup(spikeGroup);
}


// ==================================
// OBJECT SPAWN
// ==================================

// 물고기 (항상 같은 높이)
function spawnFish() {
    if (gameOver) return;

    const fish = fishGroup.create(860, fishY, "fish");
    fish.setScale(0.10);
    fish.setVelocityX(-gameSpeed);
    fish.body.allowGravity = false;
    fish.setDepth(2);
}

// 얼음 결정 (항상 같은 높이, 바닥 근처)
function spawnSpike() {
    if (gameOver) return;

    const spike = spikeGroup.create(860, spikeY, "spike");
    spike.setScale(0.10);             // 크기 줄임
    spike.setVelocityX(-gameSpeed);
    spike.body.allowGravity = false;
    spike.setOrigin(0.5, 1);          // 아래쪽이 spikeY에 닿도록
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

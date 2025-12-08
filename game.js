// ===============================
// 0. 전역 변수 & 상수
// ===============================
let player;
let cursors;
let restartKey;

let ground;
let bg;

let fishGroup;
let spikeGroup;

let score = 0;
let highScore = Number(localStorage.getItem("penguinHighScore") || 0);
let scoreText;
let highScoreText;
let infoText;

let gameOver = false;

let gameSpeed = 220;          // 기본 속도
const SPEED_INC = 40;         // 속도 증가량
const JUMP_POWER = -460;      // 점프 세기


// ===============================
// 1. Phaser 설정
// ===============================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    scene: { preload, create, update }
};

new Phaser.Game(config);


// ===============================
// 2. 에셋 로드
// ===============================
function preload() {
    this.load.image("sky",    "assets/sky.png");       // 배경
    this.load.image("ground", "assets/platform.png");  // ❄ 새 바닥 이미지 (지금 이거)
    this.load.image("fish",   "assets/star.png");      // 물고기
    this.load.image("spike",  "assets/bomb.png");      // 얼음 가시
    this.load.image("penguin","assets/dude.png");      // 펭귄
}


// ===============================
// 3. 씬 생성
// ===============================
function create() {
    // --- 배경 (타일 스크롤) ---
    bg = this.add.tileSprite(400, 300, 800, 600, "sky");

    // --- 바닥 ---
    ground = this.physics.add.staticImage(400, 550, "ground");
    ground.setScale(1).refreshBody();   // 필요하면 setScale 조절

    // --- 플레이어(펭귄) ---
    player = this.physics.add.sprite(150, 460, "penguin");
    player.setScale(0.25);
    player.setCollideWorldBounds(true);
    // 충돌 박스 살짝 줄여서 바닥 판정 확실하게
    player.body.setSize(player.width * 0.6, player.height * 0.9)
          .setOffset(player.width * 0.2, player.height * 0.1);

    // --- 입력키 ---
    cursors    = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // --- 그룹 ---
    fishGroup  = this.physics.add.group();
    spikeGroup = this.physics.add.group();

    // --- 점수 & 안내 텍스트 ---
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
        "SPACE / ↑ : 점프   |   얼음 가시 피하면서 오래 버티기!   R : 재시작",
        { fontSize: "16px", fill: "#ffffff" }
    );

    // --- 물리 설정 ---
    this.physics.add.collider(player, ground);
    this.physics.add.collider(spikeGroup, ground);

    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.overlap(player, spikeGroup, hitSpike, null, this);

    // --- 물고기/가시 주기적 생성 ---
    this.time.addEvent({
        delay: 1100,
        callback: spawnFish,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 1500,
        callback: spawnSpike,
        callbackScope: this,
        loop: true
    });

    // --- 일정 시간마다 속도 증가 ---
    this.time.addEvent({
        delay: 8000,
        callback: () => { gameSpeed += SPEED_INC; },
        loop: true
    });
}


// ===============================
// 4. 매 프레임 업데이트
// ===============================
function update(time, delta) {
    if (gameOver) {
        // R 키로 재시작
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            score = 0;
            gameSpeed = 220;
            gameOver = false;
            this.scene.restart();
        }
        return;
    }

    const dt = delta / 1000;

    // 배경 스크롤
    bg.tilePositionX += gameSpeed * dt;

    // 펭귄은 제자리, x속도 0
    player.setVelocityX(0);

    // 점프 (바닥에 닿아 있을 때만)
    const jumpPressed = cursors.up.isDown || cursors.space.isDown;
    if (jumpPressed && (player.body.blocked.down || player.body.touching.down)) {
        player.setVelocityY(JUMP_POWER);
    }

    // 시간에 따라 점수 증가
    score += 10 * dt;
    scoreText.setText("점수: " + Math.floor(score));

    // 화면 밖으로 나간 오브젝트 정리
    fishGroup.children.iterate(obj => {
        if (obj && obj.x < -50) obj.destroy();
    });
    spikeGroup.children.iterate(obj => {
        if (obj && obj.x < -50) obj.destroy();
    });
}


// ===============================
// 5. 물고기 생성 & 먹었을 때
// ===============================
function spawnFish() {
    if (gameOver) return;

    const y = Phaser.Math.Between(260, 430);
    const fish = fishGroup.create(860, y, "fish");
    fish.setScale(0.18);
    fish.setVelocityX(-gameSpeed);
    fish.body.allowGravity = false;
}

function collectFish(player, fish) {
    fish.destroy();
    score += 15;  // 보너스 점수
}


// ===============================
// 6. 얼음 가시 생성 & 맞았을 때
// ===============================
function spawnSpike() {
    if (gameOver) return;

    const spike = spikeGroup.create(860, 500, "spike");
    spike.setScale(0.3);
    spike.setVelocityX(-gameSpeed);
    spike.body.allowGravity = false;
}

function hitSpike(player, spike) {
    if (gameOver) return;

    gameOver = true;

    player.setTint(0xff0000);
    player.setVelocity(0, 0);

    // 최고 기록 갱신
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem("penguinHighScore", highScore);
    }

    scoreText.setText("❌ GAME OVER  |  R 눌러 재시작");
    highScoreText.setText(`최고 기록: ${highScore}`);
}

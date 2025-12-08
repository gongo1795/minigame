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
    this.load.image("ground", "assets/ground.png"); // ✅ 파일 이름 맞추기
    this.load.image("fish",   "assets/star.png");
    this.load.image("spike",  "assets/bomb.png");
    this.load.image("penguin","assets/dude.png");
}


// ==================================
// CREATE SCENE
// ==================================
function create() {

    // --- 배경 (스크롤용 타일) ---
    bg = this.add.tileSprite(400, 300, 800, 600, "sky");

    // --- 바닥 ---
    ground = this.physics.add.staticImage(400, 520, "ground");
    ground.setScale(0.5);      // 필요하면 0.4~0.6 사이로 조절
    ground.refreshBody();
    ground.setDepth(5);        // 플레이어 뒤/앞 배치 조정용

    // --- 펭귄 ---
    player = this.physics.add.sprite(140, 460, "penguin");
    player.setScale(0.23);
    player.setCollideWorldBounds(true);
    // 충돌 박스 살짝 줄이기
    player.body
        .setSize(player.width * 0.5, player.height * 0.8)
        .setOffset(player.width * 0.25, player.height * 0.2);

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
    this.physics.add.collider(player, ground);
    // ❌ spikeGroup, ground 충돌 제거 (멈추는 원인)
    // this.physics.add.collider(spikeGroup, ground);

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

    const dt = delta / 1000;

    // 배경 스크롤
    bg.tilePositionX += gameSpeed * dt;

    // 펭귄은 제자리
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
function spawnFish() {
    if (gameOver) return;

    const y = Phaser.Math.Between(330, 450);  // 비교적 낮게
    const fish = fishGroup.create(860, y, "fish");
    fish.setScale(0.12);                      // 크기 줄임
    fish.setVelocityX(-gameSpeed);
    fish.body.allowGravity = false;
}

function spawnSpike() {
    if (gameOver) return;

    const spike = spikeGroup.create(860, 500, "spike");
    spike.setScale(0.22);                     // 크기 줄임
    spike.setVelocityX(-gameSpeed);
    spike.body.allowGravity = false;
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

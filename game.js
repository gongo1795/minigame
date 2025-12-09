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

let gameSpeed = 220;

let fishY = 0;
let spikeY = 0;

// 오프셋(미세 조정값)
const FISH_OFFSET = 25;   // 물고기는 펭귄보다 약간 위
const SPIKE_OFFSET = 55;  // 얼음결정은 바닥에 딱 닿게

// ==================================
// CONFIG
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

    // 배경
    bg = this.add.tileSprite(400, 300, 800, 600, "sky");

    // ⬇️  보이는 바닥 (화면 아래에 절반 숨김)
    ground = this.add.image(400, 770, "ground");
    ground.setOrigin(0.5, 1);
    ground.setScale(1.4);
    ground.setDepth(1);

    const groundTopY = ground.y - ground.displayHeight + 40; // 눈 윗선

    // 충돌용 바닥(보이지 않음)
    groundCollider = this.physics.add.staticImage(400, groundTopY + 12 , "ground");
    groundCollider.setScale(1.4);
    groundCollider.refreshBody();
    groundCollider.setVisible(false);

    // 🐧 펭귄
    player = this.physics.add.sprite(140, groundTopY - 60, "penguin");
    player.setScale(0.15);
    player.setDepth(2);
    player.setCollideWorldBounds(true);

    // 고정 생성 위치 계산
    fishY  = player.y + 70;   // 80 → 70 : 물고기 좀 더 위
    spikeY = player.y + player.displayHeight / 2 + 140; // 140 → 130 : 얼음도 조금 위


    // 히트박스 수정
   // 히트박스 수정 → 펭귄이 바닥에서 떠 보이게 조정
    player.body.setSize(player.width * 0.45, player.height * 0.55);
    player.body.setOffset(player.width * 0.3, player.height * 0.42);


    // 입력
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // 그룹
    fishGroup = this.physics.add.group();
    spikeGroup = this.physics.add.group();

    // UI
    scoreText = this.add.text(16, 16, "점수: 0", { fontSize: "28px", fill: "#ffffff" });
    highScoreText = this.add.text(16, 48, `최고 기록: ${highScore}`, { fontSize: "22px", fill: "#ffffaa" });
    infoText = this.add.text(16, 80, "↑ or SPACE = 점프 | R = 재시작", { fontSize: "18px", fill: "#ffffff" });

    // 충돌
    this.physics.add.collider(player, groundCollider);
    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.overlap(player, spikeGroup, hitSpike, null, this);

    // 스폰 타이머
    this.time.addEvent({ delay: 2400, callback: spawnFish, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 3000, callback: spawnSpike, callbackScope: this, loop: true });

    this.time.addEvent({ delay: 9000, callback: () => (gameSpeed += 50), loop: true });
}


// ==================================
// UPDATE
// ==================================
function update(time, delta) {

    if (gameOver) {
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            score = 0;
            gameSpeed = 220;
            gameOver = false;
            this.scene.restart();
        }
        return;
    }

    const dt = delta / 1000;
    bg.tilePositionX += gameSpeed * dt;
    player.setVelocityX(0);

    if ((cursors.up.isDown || cursors.space.isDown) && player.body.blocked.down) {
        player.setVelocityY(-460);
    }

    score += 10 * dt;
    scoreText.setText("점수: " + Math.floor(score));

    cleanupGroup(fishGroup);
    cleanupGroup(spikeGroup);
}


// ==================================
// SPAWN OBJECTS
// ==================================
function spawnFish() {
    const fish = fishGroup.create(860, fishY, "fish");
    fish.setScale(0.10);
    fish.setVelocityX(-gameSpeed);
    fish.body.allowGravity = false;
    fish.setDepth(2);
}

function spawnSpike() {
    const spike = spikeGroup.create(860, spikeY, "spike");
    spike.setScale(0.10);
    spike.setVelocityX(-gameSpeed);
    spike.body.allowGravity = false;
    spike.setOrigin(0.5, 1);
    spike.setDepth(2);
}


// ==================================
// COLLISION
// ==================================
function collectFish(player, fish) {
    fish.destroy();
    score += 20;
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
// CLEANUP
// ==================================
function cleanupGroup(group) {
    group.children.iterate(obj => {
        if (obj && obj.x < -80) obj.destroy();
    });
}

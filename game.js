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
    this.load.image("sky", "assets/sky.png");
    this.load.image("ground", "assets/platform.png");
    this.load.image("fish", "assets/star.png");
    this.load.image("spike", "assets/bomb.png");
    this.load.image("penguin", "assets/dude.png");
}


// ==================================
// CREATE SCENE
// ==================================
function create() {

    // --- 배경 ---
    bg = this.add.tileSprite(400, 300, 800, 600, "sky");

    // --- 바닥 (수정 완료) ---
    ground = this.physics.add.staticImage(400, 510, "ground");
    ground.setScale(0.45);
    ground.refreshBody();
    ground.setDepth(10);


    // --- 펭귄 ---
    player = this.physics.add.sprite(140, 470, "penguin");
    player.setScale(0.23);
    player.setCollideWorldBounds(true);
    player.body.setSize(player.width * 0.5, player.height * 0.8).setOffset(30, 20);


    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);


    fishGroup  = this.physics.add.group();
    spikeGroup = this.physics.add.group();


    scoreText = this.add.text(16, 16, "점수: 0", { fontSize: "28px", fill: "#ffffff" });
    highScoreText = this.add.text(16, 48, `최고 기록: ${highScore}`, { fontSize: "22px", fill: "#ffffaa" });
    infoText = this.add.text(16, 80, "↑ SPACE = 점프 | R = 재시작", { fontSize: "18px", fill: "#ffffff" });


    this.physics.add.collider(player, ground);
    this.physics.add.collider(spikeGroup, ground);


    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.overlap(player, spikeGroup, hitSpike, null, this);


    this.time.addEvent({ delay: 2400, callback: spawnFish, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 3000, callback: spawnSpike, callbackScope: this, loop: true });


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
        if (Phaser.Input.Keyboard.JustDown(restartKey)) this.scene.restart();
        return;
    }

    const dt = delta / 1000;

    // 배경 스크롤 (속도 반영)
    bg.tilePositionX += gameSpeed * dt;

    // 펭귄은 움직이지 않음 (러너 컨셉)
    player.setVelocityX(0);

    // 점프
    if ((cursors.up.isDown || cursors.space.isDown) && player.body.blocked.down) {
        player.setVelocityY(-460);
    }

    // 점수 증가
    score += 10 * dt;
    scoreText.setText("점수: " + Math.floor(score));

    // 화면 밖 제거
    removeOffscreen(fishGroup);
    removeOffscreen(spikeGroup);
}


// ==================================
// CREATE OBJECTS
// ==================================
function spawnFish() {
    if (gameOver) return;

    let y = Phaser.Math.Between(330, 450); // 낮게 생성
    let fish = fishGroup.create(860, y, "fish");
    fish.setScale(0.12); // 크기 감소
    fish.setVelocityX(-gameSpeed);
    fish.body.allowGravity = false;
}

function spawnSpike() {
    if (gameOver) return;

    let spike = spikeGroup.create(860, 500, "spike");
    spike.setScale(0.22); // 크기 감소
    spike.setVelocityX(-gameSpeed);
    spike.body.allowGravity = false;
}


// ==================================
// COLLISIONS
// ==================================
function collectFish(player, fish) {
    fish.destroy();
    score += 20;
}

function hitSpike() {
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
// CLEANUP HELPERS
// ==================================
function removeOffscreen(group) {
    group.children.iterate(obj => {
        if (obj && obj.x < -80) obj.destroy();
    });
}

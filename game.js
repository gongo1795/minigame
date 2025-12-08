// ============================
// 전역 변수
// ============================
let player;
let cursors;
let ground;
let fishGroup;
let spikesGroup;
let score = 0;
let scoreText;
let gameOver = false;
let restartKey;

// ============================
// 게임 설정
// ============================
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

// ============================
// 리소스 로드
// ============================
function preload() {
    this.load.image("sky", "assets/sky.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("fish", "assets/star.png");
    this.load.image("spike", "assets/bomb.png");
    this.load.image("penguin", "assets/dude.png");
}

// ============================
// 씬 생성
// ============================
function create() {
    // 배경
    this.add.image(400, 300, "sky").setDisplaySize(800, 600);

    // 바닥
    ground = this.physics.add.staticImage(400, 550, "ground");
    ground.setScale(1).refreshBody();

    // 플레이어 (자동 이동)
    player = this.physics.add.sprite(100, 460, "penguin");
    player.setScale(0.25);
    player.setCollideWorldBounds(true);
    player.body.setSize(80, 150, true);

    // 입력
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // 점수 텍스트
    scoreText = this.add.text(16, 16, "점수: 0", {
        fontSize: "32px",
        fill: "#ffffff"
    });

    // 물고기 그룹
    fishGroup = this.physics.add.group({
        key: "fish",
        repeat: 4,
        setXY: { x: 400, y: 200, stepX: 200 }
    });

    fishGroup.children.iterate(f => {
        f.setScale(0.2);
        f.setBounce(0.4);
        f.setVelocityX(-200);
        f.body.allowGravity = false;
    });

    // 장애물 (얼음 가시)
    spikesGroup = this.physics.add.group();

    createSpike(this);

    // 충돌 시스템
    this.physics.add.collider(player, ground);
    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.collider(player, spikesGroup, hitSpike, null, this);
}

// ============================
// 장애물 생성 함수
// ============================
function createSpike(scene) {
    const spike = spikesGroup.create(850, 480, "spike");
    spike.setScale(0.35);
    spike.setVelocityX(-250);
    spike.body.allowGravity = false;

    // 반복 생성
    scene.time.addEvent({
        delay: Phaser.Math.Between(1500, 3000),
        callback: () => createSpike(scene),
        loop: true
    });
}

// ============================
// 게임 업데이트 (프레임별 실행)
// ============================
function update() {
    if (gameOver) {
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            this.scene.restart();
            score = 0;
            gameOver = false;
        }
        return;
    }

    // 자동 이동
    player.setVelocityX(200);

    // 점프
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-450);
    }

    // 물고기와 장애물이 화면 밖 나가면 제거
    fishGroup.children.iterate(f => {
        if (f.x < -50) f.destroy();
    });

    spikesGroup.children.iterate(s => {
        if (s.x < -50) s.destroy();
    });
}

// ============================
// 물고기 먹었을 때
// ============================
function collectFish(player, fish) {
    fish.destroy();
    score += 10;
    scoreText.setText("점수: " + score);
}

// ============================
// 장애물 충돌 시 게임오버
// ============================
function hitSpike() {
    gameOver = true;
    player.setTint(0xff0000);
    player.setVelocityX(0);
    scoreText.setText("Game Over! R 눌러 재시작");
}

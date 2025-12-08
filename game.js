// ==============================
// 0. 전역 변수
// ==============================
let player;
let platforms;
let cursors;
let stars;
let bombs;
let score = 0;
let scoreText;
let gameOver = false;

let gameWon = false;
let restartKey;
let instructionsText;

// 스케일(이미지 크기 조절용)
const PLATFORM_SCALE = 0.4;
const PLAYER_SCALE   = 0.25;
const STAR_SCALE     = 0.18;
const BOMB_SCALE     = 0.25;


// ==============================
// 1. Phaser 게임 설정
// ==============================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);


// ==============================
// 2. 이미지 로드
// ==============================
function preload () {
    this.load.image('sky', 'assets/sky.png');       // 배경
    this.load.image('platform', 'assets/platform.png'); // 발판
    this.load.image('star', 'assets/star.png');     // 물고기
    this.load.image('bomb', 'assets/bomb.png');     // 얼음 가시
    this.load.image('dude', 'assets/dude.png');     // 펭귄 (한 장짜리)
}


// ==============================
// 3. 오브젝트 생성
// ==============================
function create () {
    // 1) 배경
    this.add.image(400, 300, 'sky')
        .setDisplaySize(800, 600);

    // 2) 플랫폼 (점프 루트 생기게 배치)
    platforms = this.physics.add.staticGroup();

    // 바닥
    platforms.create(400, 580, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    // 위쪽 발판들 (좌 → 우로 점프 가능하게)
    platforms.create(200, 450, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(450, 350, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(700, 280, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(400, 200, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    // 3) 플레이어(펭귄)
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setScale(PLAYER_SCALE);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    // 4) 키 입력
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // 5) 물고기 (맵에 맞춰 위치 지정)
    stars = this.physics.add.group();

    const starPositions = [
        { x: 200, y: 400 },
        { x: 450, y: 300 },
        { x: 700, y: 230 },
        { x: 400, y: 150 },
        { x: 100, y: 280 }
    ];

    starPositions.forEach(pos => {
        let star = stars.create(pos.x, pos.y, 'star');
        star.setScale(STAR_SCALE);
        star.setBounceY(Phaser.Math.FloatBetween(0.3, 0.5));
    });

    // 6) 얼음 가시
    bombs = this.physics.add.group();

    // 7) 점수 & 설명 텍스트
    scoreText = this.add.text(16, 16, '점수: 0', {
        fontSize: '28px',
        fill: '#ffffff'
    });

    instructionsText = this.add.text(
        16,
        52,
        '← → 이동, ↑ 점프, 모든 물고기를 먹으면 클리어, R = 다시 시작',
        { fontSize: '18px', fill: '#ffffff' }
    );

    // 8) 충돌 설정
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);

    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.collider(player, bombs, hitBomb, null, this);
}


// ==============================
// 4. 매 프레임 업데이트
// ==============================
function update () {
    // 게임이 끝났거나(사망/클리어) 멈춘 상태
    if (gameOver || gameWon) {
        // R 키로 재시작
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            this.scene.restart();
            gameOver = false;
            gameWon = false;
            score = 0;
        }
        return;
    }

    // 좌우 이동
    if (cursors.left.isDown) {
        player.setVelocityX(-260);   // 살짝 빠르게
        player.setFlipX(true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(260);
        player.setFlipX(false);
    } else {
        player.setVelocityX(0);
    }

    // 점프 (바닥에 닿아 있을 때만)
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-380);   // 점프 조금 더 높게
    }
}


// ==============================
// 5. 물고기 먹었을 때
// ==============================
function collectStar (player, star) {
    star.disableBody(true, true);

    score += 10;
    scoreText.setText('점수: ' + score);

    // 아직 먹지 않은 물고기가 남아 있나?
    if (stars.countActive(true) === 0) {
        // ✅ 모든 물고기를 다 먹었으면 → 클리어
        gameWon = true;
        this.physics.pause();

        instructionsText.setText('클리어! R 키를 눌러 다시 시작');
    } else {
        // 아직 남아 있으면 얼음 가시 하나 생성 (난이도용)
        const x = (player.x < 400)
            ? Phaser.Math.Between(400, 800)
            : Phaser.Math.Between(0, 400);

        const bomb = bombs.create(x, 16, 'bomb');
        bomb.setScale(BOMB_SCALE);
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.allowGravity = false;
    }
}


// ==============================
// 6. 얼음 가시에 맞았을 때
// ==============================
function hitBomb (player, bomb) {
    this.physics.pause();
    player.setTint(0xff0000);
    gameOver = true;

    instructionsText.setText('Game Over! R 키를 눌러 다시 시작');
}

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
const PLATFORM_SCALE = 0.6;   // 바닥/발판 크기
const PLAYER_SCALE   = 0.25;  // 펭귄 크기
const STAR_SCALE     = 0.18;  // 물고기 크기
const BOMB_SCALE     = 0.22;  // 얼음 가시 크기


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
    this.load.image('sky', 'assets/sky.png');          // 배경
    this.load.image('platform', 'assets/platform.png');// 발판/바닥
    this.load.image('star', 'assets/star.png');        // 물고기
    this.load.image('bomb', 'assets/bomb.png');        // 얼음 가시
    this.load.image('dude', 'assets/dude.png');        // 펭귄
}


// ==============================
// 3. 오브젝트 생성
// ==============================
function create () {
    // 1) 배경
    this.add.image(400, 300, 'sky')
        .setDisplaySize(800, 600);

    // 2) 플랫폼 (바닥 + 발판)
    platforms = this.physics.add.staticGroup();

    // 바닥: 화면 전체를 덮도록 크게
    platforms.create(400, 590, 'platform')
        .setScale(1.6)          // 바닥은 더 크게
        .refreshBody();

    // 점프해서 올라갈 수 있는 발판들
    platforms.create(220, 450, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(500, 360, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(740, 280, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(380, 210, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    // 3) 플레이어(펭귄)
    player = this.physics.add.sprite(100, 520, 'dude');
    player.setScale(PLAYER_SCALE);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);   // 화면 밖으로 못 나가게

    // 4) 키 입력
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // 5) 물고기 (발판 위에 배치)
    stars = this.physics.add.group();

    const starPositions = [
        { x: 220, y: 410 },  // 첫 번째 발판 위
        { x: 500, y: 320 },  // 두 번째 발판 위
        { x: 740, y: 240 },  // 세 번째 발판 위
        { x: 380, y: 170 },  // 제일 위 발판 위
        { x: 120, y: 350 }   // 중간 공중
    ];

    starPositions.forEach(pos => {
        let star = stars.create(pos.x, pos.y, 'star');
        star.setScale(STAR_SCALE);
        star.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4));
    });

    // 6) 얼음 가시(적)
    bombs = this.physics.add.group();

    // 7) 점수 & 설명 텍스트
    scoreText = this.add.text(16, 16, '점수: 0', {
        fontSize: '28px',
        fill: '#ffffff'
    });

    instructionsText = this.add.text(
        16,
        52,
        '← → 이동, ↑ 점프  |  모든 물고기를 먹으면 클리어!  |  얼음 가시는 피하세요.  R = 다시 시작',
        { fontSize: '16px', fill: '#ffffff' }
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
        player.setVelocityX(-260);
        player.setFlipX(true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(260);
        player.setFlipX(false);
    } else {
        player.setVelocityX(0);
    }

    // 점프 (바닥이나 발판에 닿아 있을 때만)
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-380);
    }
}


// ==============================
// 5. 물고기 먹었을 때
// ==============================
function collectStar (player, star) {
    star.disableBody(true, true);   // 물고기 숨기기
    score += 10;
    scoreText.setText('점수: ' + score);

    // 남은 물고기 없으면 → 클리어
    if (stars.countActive(true) === 0) {
        gameWon = true;
        this.physics.pause();

        instructionsText.setText('🎉 클리어! R 키를 눌러 다시 시작');
    } else {
        // 아직 남아 있으면 얼음 가시 하나 생성 (난이도 상승)
        const x = (player.x < 400)
            ? Phaser.Math.Between(420, 780)  // 플레이어 반대편에서 생성
            : Phaser.Math.Between(20, 380);

        const bomb = bombs.create(x, 0, 'bomb');
        bomb.setScale(BOMB_SCALE);
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 200);
        bomb.allowGravity = false; // 튕기기만 하도록
    }
}


// ==============================
// 6. 얼음 가시에 맞았을 때
// ==============================
function hitBomb (player, bomb) {
    this.physics.pause();
    player.setTint(0xff0000);
    gameOver = true;

    instructionsText.setText('💥 Game Over!  R 키를 눌러 다시 시작');
}

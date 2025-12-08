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

const PLATFORM_SCALE = 0.4; // 발판 크기
const PLAYER_SCALE   = 0.25; // 펭귄 크기
const STAR_SCALE     = 0.18; // 물고기 크기
const BOMB_SCALE     = 0.25; // 얼음 가시 크기


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
    this.load.image('platform', 'assets/platform.png'); // 발판
    this.load.image('star', 'assets/star.png');        // 물고기
    this.load.image('bomb', 'assets/bomb.png');        // 얼음 가시
    this.load.image('dude', 'assets/dude.png');        // 펭귄 (한 장짜리)
}

// ==============================
// 3. 오브젝트 생성
// ==============================
function create () {
    // 1) 배경
    this.add.image(400, 300, 'sky')
        .setDisplaySize(800, 600);   // 캔버스 크기에 맞게 늘이기

    // 2) 플랫폼(발판)
    platforms = this.physics.add.staticGroup();

    // 바닥
    platforms.create(400, 580, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    // 공중 발판들
    platforms.create(650, 420, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(150, 320, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    platforms.create(750, 260, 'platform')
        .setScale(PLATFORM_SCALE)
        .refreshBody();

    // 3) 플레이어(펭귄)
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setScale(PLAYER_SCALE);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    // 4) 키 입력
    cursors = this.input.keyboard.createCursorKeys();

    // 5) 물고기(아이템) - 개수 줄이고 간격 넓히기
    stars = this.physics.add.group({
        key: 'star',
        repeat: 4,                           // 11 → 4 로 줄이기
        setXY: { x: 120, y: 50, stepX: 150 } // 간격 70 → 150
    });

    stars.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.3, 0.5));
        child.setScale(STAR_SCALE);
    });

    // 6) 얼음 가시(적)
    bombs = this.physics.add.group();

    // 7) 점수 표시
    scoreText = this.add.text(16, 16, '점수: 0', {
        fontSize: '32px',
        fill: '#ffffff'
    });

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
    if (gameOver) return;

    // 좌우 이동
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.setFlipX(true);   // 왼쪽 볼 때 뒤집기
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.setFlipX(false);  // 오른쪽
    } else {
        player.setVelocityX(0);
    }

    // 점프 (바닥에 닿아있을 때만)
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-330);
    }
}

// ==============================
// 5. 물고기 먹었을 때
// ==============================
function collectStar (player, star) {
    star.disableBody(true, true);

    score += 10;
    scoreText.setText('점수: ' + score);

    // 남은 물고기가 없으면 다시 생성 + 얼음 가시 추가
    if (stars.countActive(true) === 0) {
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });

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

    alert('Game Over! 점수: ' + score);
}

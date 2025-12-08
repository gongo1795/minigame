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
    // 3-1. 배경
    this.add.image(400, 300, 'sky');

    // 3-2. 플랫폼(발판)
    platforms = this.physics.add.staticGroup();

    // 바닥
    platforms.create(400, 568, 'platform')
        .setScale(2)      // 필요하면 크기 조정
        .refreshBody();

    // 공중 발판
    platforms.create(600, 400, 'platform');
    platforms.create(50, 250, 'platform');
    platforms.create(750, 220, 'platform');

    // 3-3. 플레이어(펭귄)
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setScale(0.35);          // 펭귄이 너무 크면 숫자 줄이기
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    // 3-4. 키 입력
    cursors = this.input.keyboard.createCursorKeys();

    // 3-5. 물고기(아이템)
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });

    stars.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        child.setScale(0.7);
    });

    // 3-6. 얼음 가시(적)
    bombs = this.physics.add.group();

    // 3-7. 점수 텍스트
    scoreText = this.add.text(16, 16, '점수: 0', {
        fontSize: '32px',
        fill: '#ffffff'
    });

    // 3-8. 충돌 설정
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

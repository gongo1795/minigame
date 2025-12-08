// ===================================
// 1. 전역 변수 선언
// ===================================
let player;
let platforms;
let cursors;
let stars;      // 아이템 (별)
let bombs;      // 적(폭탄)
let score = 0;
let scoreText;
let gameOver = false;

// ===================================
// 2. 게임 환경 설정
// ===================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 }, // 아래로 당기는 힘
            debug: false
        }
    },
    scene: {
        preload: preload, // 이미지 등 로드
        create: create,   // 객체 생성
        update: update    // 매 프레임마다 실행
    }
};

// Phaser 게임 생성
const game = new Phaser.Game(config);

// ===================================
// 3. 리소스 로드
// ===================================
function preload () {
    // 배경, 플랫폼, 별, 폭탄, 캐릭터 스프라이트 로드
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 'assets/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

// ===================================
// 4. 게임 객체 생성
// ===================================
function create () {
    // 4-1. 배경
    this.add.image(400, 300, 'sky'); // (x, y, 키)

    // 4-2. 플랫폼 그룹 생성
    platforms = this.physics.add.staticGroup();

    // 바닥
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    // 공중 플랫폼
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // 4-3. 플레이어 캐릭터 생성
    player = this.physics.add.sprite(100, 450, 'dude');

    player.setBounce(0.2);              // 착지할 때 살짝 튀기기
    player.setCollideWorldBounds(true); // 화면 밖으로 나가지 않게

    // 4-4. 플레이어 애니메이션 정의
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // 4-5. 키보드 입력 설정
    cursors = this.input.keyboard.createCursorKeys();

    // 4-6. 별(아이템) 그룹 생성
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });

    stars.children.iterate(function (child) {
        // 랜덤하게 튀는 정도 설정
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    // 4-7. 폭탄(적) 그룹 생성
    bombs = this.physics.add.group();

    // 4-8. 점수 텍스트
    scoreText = this.add.text(16, 16, '점수: 0', {
        fontSize: '32px',
        fill: '#000'
    });

    // 4-9. 충돌 설정
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(bombs, platforms);

    // 플레이어와 별이 겹치면 collectStar 함수 실행
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // 플레이어와 폭탄이 부딪히면 hitBomb 함수 실행
    this.physics.add.collider(player, bombs, hitBomb, null, this);
}

// ===================================
// 5. 매 프레임마다 호출되는 업데이트 함수
// ===================================
function update () {
    if (gameOver) {
        return;
    }

    // 왼쪽/오른쪽 이동
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    }
    else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    }
    else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    // 점프 (바닥에 닿아 있을 때만)
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-330);
    }
}

// ===================================
// 6. 별을 먹었을 때 호출되는 함수
// ===================================
function collectStar (player, star) {
    star.disableBody(true, true); // 별 숨기기(비활성화)

    score += 10;
    scoreText.setText('점수: ' + score);

    // 별이 다 없어졌으면 다시 생성 + 폭탄 추가
    if (stars.countActive(true) === 0) {
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });

        // 폭탄 생성 위치 결정 (플레이어 반대쪽)
        const x = (player.x < 400)
            ? Phaser.Math.Between(400, 800)
            : Phaser.Math.Between(0, 400);

        const bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

// ===================================
// 7. 폭탄에 맞았을 때 호출되는 함수
// ===================================
function hitBomb (player, bomb) {
    this.physics.pause();       // 물리엔진 정지
    player.setTint(0xff0000);   // 플레이어를 빨갛게
    player.anims.play('turn');

    gameOver = true;

    alert('Game Over! 당신의 점수: ' + score);
    // 필요하면 자동 재시작:
    // this.scene.restart();
}

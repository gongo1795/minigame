// =====================================
// 0. 전역 변수 & 상수
// =====================================
let player;
let ground;
let cursors;
let spaceKey;
let restartKey;

let fishes;  // 보너스 물고기
let bombs;   // 얼음 가시
let score = 0;
let scoreText;
let infoText;
let gameOver = false;

let bg;      // 스크롤되는 배경

const SCROLL_SPEED   = 260;   // 배경/장애물 왼쪽으로 흐르는 속도
const JUMP_VELOCITY  = -420;  // 점프 힘
const PLAYER_SCALE   = 0.25;
const GROUND_SCALE_X = 2.5;   // 바닥 가로 스케일
const GROUND_SCALE_Y = 0.9;
const FISH_SCALE     = 0.20;
const BOMB_SCALE     = 0.22;


// =====================================
// 1. Phaser 기본 설정
// =====================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 }, // 중력
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


// =====================================
// 2. 이미지 로드
// =====================================
function preload () {
    this.load.image('sky', 'assets/sky.png');        // 배경
    this.load.image('platform', 'assets/platform.png'); // 바닥
    this.load.image('bomb', 'assets/bomb.png');      // 얼음 가시
    this.load.image('star', 'assets/star.png');      // 물고기
    this.load.image('dude', 'assets/dude.png');      // 펭귄
}


// =====================================
// 3. 씬 생성
// =====================================
function create () {
    // 1) 스크롤되는 배경
    bg = this.add.tileSprite(400, 300, 800, 600, 'sky');

    // 2) 바닥(플랫폼 하나만 크게)
    ground = this.physics.add.staticImage(400, 560, 'platform');
    ground.setScale(GROUND_SCALE_X, GROUND_SCALE_Y);
    ground.refreshBody();

    // 3) 플레이어(펭귄) - 항상 왼쪽에 고정, 점프만
    player = this.physics.add.sprite(150, 480, 'dude');
    player.setScale(PLAYER_SCALE);
    player.setCollideWorldBounds(true);
    player.setBounce(0); // 튕김 없음

    // 충돌 범위가 너무 크면 여기서 body 크기 조정 가능
    // player.body.setSize(width, height).setOffset(offsetX, offsetY);

    // 4) 입력 키
    cursors   = this.input.keyboard.createCursorKeys();
    spaceKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // 5) 그룹 생성
    fishes = this.physics.add.group();
    bombs  = this.physics.add.group();

    // 6) 점수 & 안내 텍스트
    scoreText = this.add.text(16, 16, '점수: 0', {
        fontSize: '28px',
        fill: '#ffffff'
    });

    infoText = this.add.text(
        16,
        52,
        'SPACE 또는 ↑ 점프  |  물고기 = 점수, 얼음 가시 = Game Over,  R = 재시작',
        { fontSize: '16px', fill: '#ffffff' }
    );

    // 7) 물리 충돌/겹침 설정
    this.physics.add.collider(player, ground);
    this.physics.add.collider(bombs, ground);

    this.physics.add.overlap(player, fishes, collectFish, null, this);
    this.physics.add.overlap(player, bombs, hitBomb, null, this);

    // 8) 주기적으로 장애물 & 물고기 생성
    this.time.addEvent({
        delay: 1300,           // 1.3초마다 장애물 생성
        callback: spawnBomb,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 900,            // 0.9초마다 물고기 생성
        callback: spawnFish,
        callbackScope: this,
        loop: true
    });
}


// =====================================
// 4. 매 프레임 호출
// =====================================
function update () {
    if (gameOver) {
        // R 키로 재시작
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            this.scene.restart();
            score = 0;
            gameOver = false;
        }
        return;
    }

    // 배경 스크롤 (왼쪽으로 흐르는 느낌)
    bg.tilePositionX += SCROLL_SPEED * this.game.loop.delta / 1000;

    // 플레이어는 x 위치 고정, 점프만 제어
    player.setVelocityX(0);

    const jumpPressed = cursors.up.isDown || spaceKey.isDown;

    if (jumpPressed && player.body.touching.down) {
        player.setVelocityY(JUMP_VELOCITY);
    }

    // 화면 밖 아래로 떨어지면 Game Over
    if (player.y > 620) {
        hitBomb.call(this, player, null);
    }

    // 화면 왼쪽으로 나간 물체는 삭제 (성능 & 깔끔)
    fishes.children.iterate(obj => {
        if (obj && obj.x < -50) obj.destroy();
    });
    bombs.children.iterate(obj => {
        if (obj && obj.x < -50) obj.destroy();
    });
}


// =====================================
// 5. 물고기 생성 & 먹었을 때
// =====================================
function spawnFish () {
    if (gameOver) return;

    // 물고기 출현 높이 (살짝 랜덤)
    const minY = 280;
    const maxY = 520;
    const y = Phaser.Math.Between(minY, maxY);

    // 오른쪽 밖에서 튀어나오게
    const fish = fishes.create(850, y, 'star');
    fish.setScale(FISH_SCALE);
    fish.setVelocityX(-SCROLL_SPEED);
    fish.body.allowGravity = false;
}

function collectFish (player, fish) {
    fish.destroy();
    score += 10;
    scoreText.setText('점수: ' + score);
}


// =====================================
// 6. 얼음 가시 생성 & 맞았을 때
// =====================================
function spawnBomb () {
    if (gameOver) return;

    const y = 520; // 거의 바닥 높이

    const bomb = bombs.create(850, y, 'bomb');
    bomb.setScale(BOMB_SCALE);
    bomb.setVelocityX(-SCROLL_SPEED);
    bomb.body.allowGravity = false;
}

function hitBomb (player, bomb) {
    if (gameOver) return;

    this.physics.pause();
    player.setTint(0xff0000);
    gameOver = true;

    infoText.setText('💥 Game Over!   R 키를 눌러 다시 시작');
}

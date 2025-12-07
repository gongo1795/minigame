// ===================================
// 1. 전역 변수 선언
// ===================================
let player;
let platforms;
let cursors;
let stars; // 아이템 (별)
let score = 0;
let scoreText;
let bombs; // 폭탄 (적)

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
            gravity: { y: 300 }, // 중력 설정
            debug: false // 디버그: 충돌 영역을 보려면 true로 변경
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// ===================================
// 3. preload 함수 (리소스 불러오기)
// ===================================
function preload ()
{
    // (assets 폴더에 파일이 있다고 가정)
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png'); // 아이템
    this.load.image('bomb', 'assets/bomb.png'); // 적
    
    // 플레이어 스프라이트 시트
    this.load.spritesheet('dude', 
        'assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );
}

// ===================================
// 4. create 함수 (초기 환경 구성)
// ===================================
function create ()
{
    // 1. 배경 이미지 배치
    this.add.image(400, 300, 'sky'); 

    // 2. 플랫폼 (바닥 및 발판) 그룹 생성
    // staticGroup은 중력의 영향을 받지 않고 고정된 물체
    platforms = this.physics.add.staticGroup();

    // 바닥 (화면 아래 전체)
    // setScale(2)로 2배 확대, refreshBody()로 물리 경계를 업데이트
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    // 공중 플랫폼
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // 3. 플레이어 생성
    player = this.physics.add.sprite(100, 450, 'dude');

    player.setBounce(0.2); // 튀는 정도
    player.setCollideWorldBounds(true); // 화면 경계 충돌

    // 플레이어 애니메이션 정의
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

    // 4. 아이템(별) 생성 및 배치
    // group은 중력의 영향을 받는 물체
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11, // 총 12개 (0부터 시작하므로)
        setXY: { x: 12, y: 0, stepX: 70 } // x=12부터 시작, 70 간격으로 배치
    });

    stars.children.iterate(function (child) {
        // 별들이 무작위로 튕기게 설정
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    // 5. 적(폭탄) 그룹 생성
    bombs = this.physics.add.group();


    // 6. 충돌 및 상호작용 설정
    // 플레이어와 플랫폼 충돌
    this.physics.add.collider(player, platforms);
    // 별과 플랫폼 충돌 (별이 바닥에 떨어지도록)
    this.physics.add.collider(stars, platforms);
    // 폭탄과 플랫폼 충돌
    this.physics.add.collider(bombs, platforms);

    // 플레이어와 별이 겹치면 (overlap), collectStar 함수 호출
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // 플레이어와 폭탄이 충돌하면, hitBomb 함수 호출
    this.physics.add.collider(player, bombs, hitBomb, null, this);
    
    // 7. 점수판 설정
    scoreText = this.add.text(16, 16, '점수: 0', { fontSize: '32px', fill: '#000' });

    // 8. 키보드 입력 설정
    cursors = this.input.keyboard.createCursorKeys();
}

// ===================================
// 5. update 함수 (게임 루프: 움직임 및 로직 처리)
// ===================================
function update ()
{
    // A. 플레이어 좌우 이동 및 애니메이션 처리
    if (cursors.left.isDown)
    {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(160);
        player.anims.play('right', true);
    }
    else
    {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    // B. 점프 처리 (위쪽 화살표 키와 바닥에 닿았는지 확인)
    if (cursors.up.isDown && player.body.touching.down)
    {
        player.setVelocityY(-330);
    }
}


// ===================================
// 6. 상호작용 함수 (Callback Functions)
// ===================================

function collectStar (player, star)
{
    star.disableBody(true, true); // 별을 비활성화하고 화면에서 제거

    // 점수 업데이트
    score += 10;
    scoreText.setText('점수: ' + score);

    // 모든 별을 다 모으면 새로운 레벨 시작 (폭탄 생성)
    if (stars.countActive(true) === 0)
    {
        // 남은 별이 없으면, 모든 별을 다시 활성화
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });

        // 폭탄 생성 (새로운 적)
        let x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        
        let bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1); // 폭탄이 튀게 설정
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20); // 무작위 속도로 이동
    }
}

function hitBomb (player, bomb)
{
    // 충돌 시 게임 일시 정지 및 플레이어 사망 처리
    this.physics.pause();

    player.setTint(0xff0000); // 플레이어를 빨갛게 만듦
    player.anims.play('turn');

    alert("Game Over! 당신의 점수: " + score); // 알림창
    
    // 게임 재시작 (옵션)
    // this.scene.restart();
}

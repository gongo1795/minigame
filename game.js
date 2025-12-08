// ===============================
// GLOBAL VARIABLES
// ===============================
let player, cursors, ground;
let fishGroup, spikesGroup;
let score = 0;
let highScore = localStorage.getItem("penguinHighScore") || 0;
let scoreText, highScoreText;
let gameOver = false;
let restartKey;

let gameSpeed = 200;


// ===============================
// GAME CONFIGURATION
// ===============================
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


// ===============================
// LOAD ASSETS
// ===============================
function preload() {
    this.load.image("sky", "assets/sky.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("fish", "assets/star.png");
    this.load.image("spike", "assets/bomb.png");
    this.load.image("penguin", "assets/dude.png");
}


// ===============================
// CREATE SCENE
// ===============================
function create() {
    // Background
    this.add.image(400, 300, "sky").setDisplaySize(800, 600);

    // Ground
    ground = this.physics.add.staticImage(400, 550, "ground");
    ground.refreshBody();

    // Player
    player = this.physics.add.sprite(120, 460, "penguin");
    player.setScale(0.25).setCollideWorldBounds(true);
    player.body.setSize(80, 150, true);

    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Score UI
    scoreText = this.add.text(16, 16, "점수: 0", {
        fontSize: "32px",
        fill: "#ffffff"
    });

    highScoreText = this.add.text(16, 56, `최고 기록: ${highScore}`, {
        fontSize: "24px",
        fill: "#ffffaa"
    });

    // Fish (bonus)
    fishGroup = this.physics.add.group();
    generateFish(this);

    // Spikes
    spikesGroup = this.physics.add.group();
    generateSpike(this);

    // Physics
    this.physics.add.collider(player, ground);
    this.physics.add.overlap(player, fishGroup, collectFish, null, this);
    this.physics.add.collider(player, spikesGroup, hitSpike, null, this);

    // Speed increase every 7 seconds
    this.time.addEvent({
        delay: 7000,
        callback: () => (gameSpeed += 50),
        loop: true
    });
}


// ===============================
// UPDATE LOOP
// ===============================
function update() {
    if (gameOver) {
        if (Phaser.Input.Keyboard.JustDown(restartKey)) {
            this.scene.restart();
            gameSpeed = 200;
            score = 0;
            gameOver = false;
        }
        return;
    }

    // Auto-run
    player.setVelocityX(gameSpeed);

    // Jump control
    if ((cursors.up.isDown || cursors.space.isDown) && player.body.touching.down) {
        player.setVelocityY(-480);
    }

    // Score increases over time
    score += 0.05;
    scoreText.setText(`점수: ${Math.floor(score)}`);
}


// ===============================
// OBJECT GENERATION
// ===============================
function generateFish(scene) {
    scene.time.addEvent({
        delay: 3000,
        callback: () => {
            let fish = fishGroup.create(900, Phaser.Math.Between(200, 400), "fish");
            fish.setScale(0.18);
            fish.setVelocityX(-gameSpeed);
            fish.body.allowGravity = false;
        },
        loop: true
    });
}

function generateSpike(scene) {
    scene.time.addEvent({
        delay: 2500,
        callback: () => {
            let spike = spikesGroup.create(850, 480, "spike");
            spike.setScale(0.35);
            spike.setVelocityX(-gameSpeed);
            spike.body.allowGravity = false;
        },
        loop: true
    });
}


// ===============================
// COLLISION FUNCTIONS
// ===============================
function collectFish(player, fish) {
    fish.destroy();
    score += 10;
}


function hitSpike(player, spike) {
    gameOver = true;
    player.setTint(0xff0000);
    player.setVelocityX(0);

    // Save high score
    if (score > highScore) {
        localStorage.setItem("penguinHighScore", Math.floor(score));
        highScore = score;
    }

    scoreText.setText("❌ GAME OVER | R 눌러 재시작 ❌");
}

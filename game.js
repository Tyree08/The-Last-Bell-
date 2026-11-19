
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");

const screens = [
  "menu", "difficulty", "settings", "intro",
  "gameOver", "ending"
];

const map = [
  "############",
  "#..........#",
  "#....#.....#",
  "#....#.....#",
  "#..........#",
  "###.####...#",
  "#..........#",
  "#..##...##.#",
  "#..........#",
  "#....#.....#",
  "#..........#",
  "############"
];

const objects = [
  {
    x: 4.5, y: 1.5, type: "note",
    name: "Old Staff Note",
    text: "The staff kept reporting strange noises from the basement.",
    found: false
  },
  {
    x: 9.5, y: 2.5, type: "key",
    name: "Office Key",
    text: "You found the office key.",
    found: false
  },
  {
    x: 1.5, y: 6.5, type: "note",
    name: "Missing Staff File",
    text: "Three former employees disappeared. The principal closed the investigation.",
    found: false
  },
  {
    x: 9.5, y: 8.5, type: "key",
    name: "Basement Key",
    text: "You found the basement key.",
    found: false
  },
  {
    x: 10.5, y: 10.5, type: "exit",
    name: "School Exit",
    text: "The exit is locked. Find both keys and all the clues.",
    found: false
  }
];

let player;
let difficulty = "normal";
let score = 0;
let keysFound = 0;
let cluesFound = 0;
let flashlight = true;
let crouching = false;
let gameRunning = false;
let soundOn = true;
let lastTime = 0;
let monster = { x: 8.5, y: 9.5 };
let monsterTimer = 0;
let messageTimer = 0;
let audioContext = null;

const keysDown = {};
const FOV = Math.PI / 3;
const SAVE_NAME = "theLastBellSave";


// SCHOOL FURNITURE AND DECORATIONS

const schoolProps = [
  { x: 1.55, y: 2.6, type: "lockers" },
  { x: 1.55, y: 3.7, type: "lockers" },
  { x: 3.4, y: 2.55, type: "desk" },
  { x: 3.5, y: 3.75, type: "chair" },
  { x: 7.5, y: 2.55, type: "desk" },
  { x: 8.6, y: 3.65, type: "desk" },
  { x: 10.35, y: 2.6, type: "lockers" },
  { x: 10.35, y: 3.8, type: "lockers" },
  { x: 2.5, y: 4.55, type: "trash" },
  { x: 8.8, y: 4.55, type: "fountain" },
  { x: 1.55, y: 6.5, type: "lockers" },
  { x: 5.5, y: 6.5, type: "desk" },
  { x: 7.4, y: 6.5, type: "chair" },
  { x: 10.35, y: 6.5, type: "clock" },
  { x: 1.55, y: 8.5, type: "poster" },
  { x: 3.4, y: 8.5, type: "trash" },
  { x: 6.5, y: 8.5, type: "desk" },
  { x: 8.5, y: 8.5, type: "cabinet" },
  { x: 10.35, y: 8.5, type: "lockers" },
  { x: 2.5, y: 10.35, type: "fountain" },
  { x: 7.5, y: 10.35, type: "poster" }
];

const propCanvases = {};

function makePropSprite(type) {
  const sprite = document.createElement("canvas");
  sprite.width = 100;
  sprite.height = 120;
  const g = sprite.getContext("2d");

  // Soft shadow
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(50, 111, 37, 7, 0, 0, Math.PI * 2);
  g.fill();

  if (type === "lockers") {
    for (let i = 0; i < 2; i++) {
      const x = 12 + i * 39;

      g.fillStyle = "#34434a";
      g.fillRect(x, 17, 35, 91);

      g.fillStyle = "#617078";
      g.fillRect(x + 3, 20, 29, 84);

      g.fillStyle = "#29343a";
      g.fillRect(x + 7, 28, 21, 3);
      g.fillRect(x + 7, 35, 21, 3);

      g.fillStyle = "#d0b879";
      g.fillRect(x + 27, 57, 3, 9);

      g.strokeStyle = "#1b252a";
      g.lineWidth = 2;
      g.strokeRect(x, 17, 35, 91);
    }

  } else if (type === "desk") {
    g.fillStyle = "#68452e";
    g.fillRect(10, 48, 80, 12);

    g.fillStyle = "#9a6b43";
    g.fillRect(13, 43, 74, 9);

    g.fillStyle = "#3a302a";
    g.fillRect(17, 60, 7, 45);
    g.fillRect(76, 60, 7, 45);

    g.fillStyle = "#b7b0a0";
    g.fillRect(27, 39, 24, 4);

    g.fillStyle = "#d7d0bf";
    g.fillRect(57, 36, 17, 7);

  } else if (type === "chair") {
    g.fillStyle = "#34434a";
    g.fillRect(26, 34, 48, 43);

    g.fillStyle = "#64747a";
    g.fillRect(30, 38, 40, 34);

    g.fillStyle = "#30383b";
    g.fillRect(25, 75, 50, 9);
    g.fillRect(31, 84, 6, 25);
    g.fillRect(64, 84, 6, 25);

  } else if (type === "trash") {
    g.fillStyle = "#303b3d";
    g.beginPath();
    g.moveTo(27, 42);
    g.lineTo(73, 42);
    g.lineTo(67, 105);
    g.lineTo(33, 105);
    g.closePath();
    g.fill();

    g.fillStyle = "#687476";
    g.fillRect(23, 35, 54, 9);

    g.strokeStyle = "#1d292b";
    g.lineWidth = 3;
    g.strokeRect(34, 52, 5, 43);
    g.strokeRect(48, 52, 5, 43);
    g.strokeRect(62, 52, 5, 43);

  } else if (type === "fountain") {
    g.fillStyle = "#66777b";
    g.fillRect(20, 49, 60, 55);

    g.fillStyle = "#aab8b7";
    g.fillRect(15, 42, 70, 12);

    g.fillStyle = "#34474b";
    g.fillRect(34, 30, 32, 13);

    g.fillStyle = "#b8d0d0";
    g.fillRect(43, 34, 14, 5);

    g.fillStyle = "#26383b";
    g.fillRect(46, 56, 8, 6);

  } else if (type === "clock") {
    g.fillStyle = "#4d3830";
    g.fillRect(17, 14, 66, 66);

    g.fillStyle = "#d9d2bd";
    g.beginPath();
    g.arc(50, 47, 27, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = "#34302b";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(50, 47, 27, 0, Math.PI * 2);
    g.stroke();

    g.strokeStyle = "#282622";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(50, 47);
    g.lineTo(50, 29);
    g.moveTo(50, 47);
    g.lineTo(64, 53);
    g.stroke();

    g.fillStyle = "#282622";
    g.beginPath();
    g.arc(50, 47, 3, 0, Math.PI * 2);
    g.fill();

  } else if (type === "poster") {
    g.fillStyle = "#493d31";
    g.fillRect(12, 12, 76, 94);

    g.fillStyle = "#e0d6bd";
    g.fillRect(17, 17, 66, 84);

    g.fillStyle = "#7c3434";
    g.fillRect(24, 25, 52, 15);

    g.fillStyle = "#343b3a";
    g.font = "bold 8px Arial";
    g.textAlign = "center";
    g.fillText("SCHOOL", 50, 36);

    g.fillStyle = "#596d63";
    g.fillRect(27, 49, 46, 4);
    g.fillRect(27, 59, 39, 4);
    g.fillRect(27, 69, 43, 4);

    g.fillStyle = "#8d4037";
    g.fillRect(39, 82, 22, 10);

  } else if (type === "cabinet") {
    g.fillStyle = "#4b4038";
    g.fillRect(15, 26, 70, 82);

    g.fillStyle = "#766456";
    g.fillRect(19, 30, 62, 74);

    g.strokeStyle = "#332b27";
    g.lineWidth = 3;
    g.strokeRect(19, 30, 62, 74);

    g.beginPath();
    g.moveTo(50, 30);
    g.lineTo(50, 104);
    g.stroke();

    g.fillStyle = "#c0a66e";
    g.fillRect(44, 62, 4, 10);
    g.fillRect(53, 62, 4, 10);
  }

  return sprite;
}


// DRAW SCHOOL FURNITURE

function drawSchoolProps(depthBuffer) {
  const width = canvas.width;
  const height = canvas.height;

  const visibleProps = schoolProps.map(prop => {
    const dx = prop.x - player.x;
    const dy = prop.y - player.y;

    const distance = Math.hypot(dx, dy);

    let angle = Math.atan2(dy, dx) - player.angle;

    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;

    return {
      prop,
      distance,
      angle,
      depth: distance * Math.cos(angle)
    };

  }).filter(item =>
    item.depth > 0.15 &&
    Math.abs(item.angle) < FOV * 0.8
  ).sort((a, b) => b.depth - a.depth);

  for (const item of visibleProps) {
    const sprite = propCanvases[item.prop.type] ||
      (propCanvases[item.prop.type] =
        makePropSprite(item.prop.type));

    const screenX =
      width / 2 +
      (Math.tan(item.angle) / Math.tan(FOV / 2)) *
      (width / 2);

    const spriteHeight = Math.min(
      height * 1.5,
      height * 0.82 / Math.max(item.depth, 0.2)
    );

    const spriteWidth =
      spriteHeight * (sprite.width / sprite.height);

    const left = Math.round(screenX - spriteWidth / 2);

    const top = Math.round(
      height / 2 - spriteHeight / 2 +
      spriteHeight * 0.08
    );

    const right = Math.round(left + spriteWidth);

    // Hide furniture behind walls.
    for (
      let screenColumn = Math.max(0, left);
      screenColumn < Math.min(width, right);
      screenColumn++
    ) {
      if (item.depth >= depthBuffer[screenColumn]) {
        continue;
      }

      const sourceX = Math.floor(
        ((screenColumn - left) / spriteWidth) *
        sprite.width
      );

      ctx.drawImage(
        sprite,
        sourceX, 0, 1, sprite.height,
        screenColumn, top, 1, spriteHeight
      );
    }
  }
}


// SCHOOL DECORATIONS

const schoolProps = [
  // Lockers in the starting hallway
  { x: 3.5, y: 1.9, type: "lockers" },
  { x: 4.5, y: 1.9, type: "lockers" },

  // Classroom furniture
  { x: 3.5, y: 2.6, type: "desk" },
  { x: 7.5, y: 2.6, type: "desk" },
  { x: 8.5, y: 3.6, type: "chair" },

  // Hallway decorations
  { x: 2.5, y: 4.5, type: "trash" },
  { x: 8.5, y: 4.5, type: "fountain" },
  { x: 1.5, y: 6.5, type: "lockers" },
  { x: 5.5, y: 6.5, type: "desk" },
  { x: 7.5, y: 6.5, type: "chair" },
  { x: 10.4, y: 6.5, type: "clock" },

  // More school decorations
  { x: 1.5, y: 8.5, type: "poster" },
  { x: 3.5, y: 8.5, type: "trash" },
  { x: 6.5, y: 8.5, type: "desk" },
  { x: 8.5, y: 8.5, type: "cabinet" },
  { x: 10.4, y: 8.5, type: "lockers" },
  { x: 2.5, y: 10.4, type: "fountain" }
];

function drawSchoolProps(depthBuffer) {
  const width = canvas.width;
  const height = canvas.height;

  for (const prop of schoolProps) {
    const dx = prop.x - player.x;
    const dy = prop.y - player.y;

    const distance = Math.hypot(dx, dy);

    let angle = Math.atan2(dy, dx) - player.angle;

    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;

    if (Math.abs(angle) > FOV / 2) continue;

    const depth = distance * Math.cos(angle);

    if (depth <= 0.2) continue;

    const screenX =
      width / 2 +
      (angle / (FOV / 2)) * (width / 2);

    const spriteHeight = Math.min(
      height * 0.9,
      height * 0.48 / depth
    );

    const spriteWidth = spriteHeight * 0.85;

    const left = Math.floor(screenX - spriteWidth / 2);
    const top = Math.floor(height / 2 - spriteHeight / 2);
    const right = Math.ceil(screenX + spriteWidth / 2);

    // Draw each decoration
    for (
      let x = Math.max(0, left);
      x < Math.min(width, right);
      x++
    ) {
      if (depth >= depthBuffer[x]) continue;

      const relativeX = (x - left) / spriteWidth;

      const spriteX = Math.floor(relativeX * 100);

      const spriteY = 0;
      const spriteHeightSource = 120;

      const sprite = propSprites[prop.type];

      if (!sprite) continue;

      ctx.drawImage(
        sprite,
        spriteX, spriteY, 1, spriteHeightSource,
        x, top, 1, spriteHeight
      );
    }
  }
}


// CREATE THE DECORATION PICTURES

const propSprites = {};

function createProp(type, drawFunction) {
  const sprite = document.createElement("canvas");

  sprite.width = 100;
  sprite.height = 120;

  const g = sprite.getContext("2d");

  drawFunction(g);

  propSprites[type] = sprite;
}


// LOCKERS

createProp("lockers", g => {
  for (let i = 0; i < 2; i++) {
    const x = 10 + i * 42;

    g.fillStyle = "#52636b";
    g.fillRect(x, 8, 38, 105);

    g.fillStyle = "#34434a";
    g.fillRect(x + 4, 12, 30, 97);

    g.fillStyle = "#202c31";
    g.fillRect(x + 9, 24, 20, 3);
    g.fillRect(x + 9, 33, 20, 3);

    g.fillStyle = "#c4a96d";
    g.fillRect(x + 28, 58, 3, 10);
  }
});


// CLASSROOM DESK

createProp("desk", g => {
  g.fillStyle = "#805735";
  g.fillRect(8, 48, 84, 14);

  g.fillStyle = "#a77848";
  g.fillRect(12, 43, 76, 9);

  g.fillStyle = "#38302a";
  g.fillRect(18, 62, 7, 48);
  g.fillRect(75, 62, 7, 48);

  g.fillStyle = "#ded5c3";
  g.fillRect(30, 36, 35, 6);
});


// CHAIR

createProp("chair", g => {
  g.fillStyle = "#42545c";
  g.fillRect(24, 35, 52, 42);

  g.fillStyle = "#657b83";
  g.fillRect(29, 40, 42, 32);

  g.fillStyle = "#30383b";
  g.fillRect(23, 77, 54, 8);
  g.fillRect(30, 85, 6, 30);
  g.fillRect(64, 85, 6, 30);
});


// TRASH CAN

createProp("trash", g => {
  g.fillStyle = "#303b3d";
  g.fillRect(27, 42, 46, 67);

  g.fillStyle = "#718084";
  g.fillRect(22, 36, 56, 9);

  g.strokeStyle = "#202a2d";
  g.lineWidth = 3;

  g.strokeRect(34, 52, 5, 45);
  g.strokeRect(48, 52, 5, 45);
  g.strokeRect(62, 52, 5, 45);
});


// WATER FOUNTAIN

createProp("fountain", g => {
  g.fillStyle = "#788a8d";
  g.fillRect(18, 45, 64, 65);

  g.fillStyle = "#b4c4c2";
  g.fillRect(13, 39, 74, 12);

  g.fillStyle = "#34474b";
  g.fillRect(34, 27, 32, 15);

  g.fillStyle = "#c4d7d3";
  g.fillRect(44, 31, 12, 5);
});


// WALL CLOCK

createProp("clock", g => {
  g.fillStyle = "#ded6c0";
  g.beginPath();
  g.arc(50, 55, 35, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = "#38332c";
  g.lineWidth = 5;
  g.stroke();

  g.beginPath();
  g.moveTo(50, 55);
  g.lineTo(50, 30);
  g.moveTo(50, 55);
  g.lineTo(70, 62);
  g.stroke();
});


// SCHOOL POSTER

createProp("poster", g => {
  g.fillStyle = "#513e32";
  g.fillRect(10, 10, 80, 100);

  g.fillStyle = "#e5dcc5";
  g.fillRect(16, 16, 68, 88);

  g.fillStyle = "#873e37";
  g.fillRect(23, 26, 54, 15);

  g.fillStyle = "#303a39";
  g.font = "bold 9px Arial";
  g.textAlign = "center";
  g.fillText("SCHOOL", 50, 37);

  g.fillStyle = "#687a69";
  g.fillRect(26, 52, 48, 5);
  g.fillRect(26, 64, 42, 5);
  g.fillRect(26, 76, 46, 5);
});


// CABINET

createProp("cabinet", g => {
  g.fillStyle = "#655044";
  g.fillRect(12, 20, 76, 90);

  g.fillStyle = "#887263";
  g.fillRect(18, 26, 64, 78);

  g.strokeStyle = "#332b27";
  g.lineWidth = 3;
  g.strokeRect(18, 26, 64, 78);

  g.beginPath();
  g.moveTo(50, 26);
  g.lineTo(50, 104);
  g.stroke();

  g.fillStyle = "#d0b477";
  g.fillRect(44, 60, 4, 10);
  g.fillRect(53, 60, 4, 10);
});

// SHOW SCREENS

function showScreen(id) {
  screens.forEach(name => {
    document.getElementById(name).classList.add("hidden");
  });

  if (id) {
    document.getElementById(id).classList.remove("hidden");
  }
}


// DISPLAY MESSAGES

function showMessage(text, seconds = 3) {
  const box = document.getElementById("message");

  box.textContent = text;
  box.classList.remove("hidden");

  messageTimer = seconds;
}


// SOUND EFFECTS

function playTone(frequency = 120, duration = 0.12) {
  if (!soundOn) return;

  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.value = 0.035;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.stop(audioContext.currentTime + duration);

  } catch (error) {
    // Game continues if browser audio is unavailable.
  }
}


// START A NEW GAME

function startNewGame(selectedDifficulty) {
  difficulty = selectedDifficulty;

  player = {
    x: 2.5,
    y: 1.5,
    angle: 0
  };

  score = 0;
  keysFound = 0;
  cluesFound = 0;
  flashlight = true;
  crouching = false;

  monster = { x: 8.5, y: 9.5 };
  monsterTimer = 0;

  objects.forEach(object => {
    object.found = false;
  });

  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("crosshair").classList.remove("hidden");
  document.getElementById("message").classList.remove("hidden");

  showScreen("intro");

  document.getElementById("introText").textContent =
    "The three students laugh as the doors close behind you. " +
    "The bully says, 'Relax. It's just one night.' " +
    "A few minutes later, the lights begin to flicker.";

  updateHUD();

  showMessage("The school is quiet. Too quiet.", 5);
}


// ENTER THE SCHOOL

function beginGame() {
  showScreen(null);

  gameRunning = true;
  lastTime = performance.now();

  canvas.requestPointerLock?.();

  playTone(90, 0.25);

  requestAnimationFrame(gameLoop);
}


// CHECK WALL COLLISIONS

function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);

  if (
    my < 0 || my >= map.length ||
    mx < 0 || mx >= map[0].length
  ) {
    return true;
  }

  return map[my][mx] === "#";
}

function canMove(x, y) {
  const radius = 0.18;

  return (
    !isWall(x - radius, y - radius) &&
    !isWall(x + radius, y - radius) &&
    !isWall(x - radius, y + radius) &&
    !isWall(x + radius, y + radius)
  );
}


// MOVE PLAYER

function movePlayer(dx, dy) {
  if (canMove(player.x + dx, player.y)) {
    player.x += dx;
  }

  if (canMove(player.x, player.y + dy)) {
    player.y += dy;
  }
}


// UPDATE INFORMATION ON SCREEN

function updateHUD() {
  document.getElementById("inventory").textContent =
    `Inventory: ${keysFound} keys · ${cluesFound} clues`;

  document.getElementById("score").textContent =
    `Score: ${score}`;

  document.getElementById("objective").textContent =
    cluesFound < 2
      ? "Objective: Find the missing staff records."
      : keysFound < 2
        ? "Objective: Find both keys."
        : "Objective: Reach the school exit.";

  document.getElementById("chapter").textContent =
    cluesFound >= 2
      ? "Chapter 3: The Escape"
      : cluesFound >= 1
        ? "Chapter 2: The Haunting"
        : "Chapter 1: Before Midnight";
}


// SAVE GAME

function saveGame() {
  const data = {
    player,
    score,
    keysFound,
    cluesFound,
    flashlight,
    difficulty,
    found: objects.map(object => object.found)
  };

  localStorage.setItem(SAVE_NAME, JSON.stringify(data));

  document.getElementById("continueGame").disabled = false;
}


// LOAD SAVED GAME

function loadGame() {
  const saved = localStorage.getItem(SAVE_NAME);

  if (!saved) {
    showMessage("There is no saved game yet.");
    return;
  }

  try {
    const data = JSON.parse(saved);

    player = data.player;
    score = data.score;
    keysFound = data.keysFound;
    cluesFound = data.cluesFound;
    flashlight = data.flashlight;
    difficulty = data.difficulty;

    objects.forEach((object, index) => {
      object.found = data.found[index];
    });

    monster = { x: 8.5, y: 9.5 };

    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("crosshair").classList.remove("hidden");

    showScreen(null);

    gameRunning = true;
    updateHUD();

    lastTime = performance.now();

    canvas.requestPointerLock?.();

    requestAnimationFrame(gameLoop);

    showMessage("You returned to the school.", 3);

  } catch (error) {
    localStorage.removeItem(SAVE_NAME);
    showMessage("Your saved game could not be loaded.");
  }
}


// INTERACT WITH OBJECTS

function interact() {
  let nearest = null;
  let nearestDistance = 1.35;

  for (const object of objects) {
    if (object.found) continue;

    const distance = Math.hypot(
      object.x - player.x,
      object.y - player.y
    );

    if (distance < nearestDistance) {
      nearest = object;
      nearestDistance = distance;
    }
  }

  if (!nearest) {
    showMessage("There is nothing nearby to interact with.");
    return;
  }

  if (nearest.type === "exit") {
    if (keysFound >= 2 && cluesFound >= 2) {
      finishGame();
    } else {
      showMessage(
        "The exit is locked. Find both keys and both clues."
      );
    }

    return;
  }

  nearest.found = true;

  score += nearest.type === "key" ? 100 : 150;

  if (nearest.type === "key") {
    keysFound++;
  } else {
    cluesFound++;
  }

  showMessage(nearest.text, 5);

  playTone(
    nearest.type === "key" ? 520 : 340,
    0.2
  );

  updateHUD();
  saveGame();
}


// WIN THE GAME

function finishGame() {
  gameRunning = false;

  localStorage.removeItem(SAVE_NAME);
  document.exitPointerLock?.();

  document.getElementById("endingText").textContent =
    `You escaped with ${score} points. ` +
    "The principal's secret is finally exposed. " +
    "But as the sun rises, one classroom light switches on by itself.";

  document.getElementById("hud").classList.add("hidden");
  document.getElementById("crosshair").classList.add("hidden");

  showScreen("ending");

  playTone(620, 0.5);
}


// GAME OVER

function caught() {
  gameRunning = false;

  localStorage.removeItem(SAVE_NAME);

  document.getElementById("continueGame").disabled = true;

  document.exitPointerLock?.();

  document.getElementById("hud").classList.add("hidden");
  document.getElementById("crosshair").classList.add("hidden");

  showScreen("gameOver");

  playTone(55, 0.6);
}


// MONSTER MOVEMENT

function updateMonster(delta) {
  monsterTimer += delta;

  const speed = difficulty === "hard" ? 0.75 : 0.4;
  const interval = difficulty === "hard" ? 0.8 : 1.5;

  if (monsterTimer < interval) return;

  monsterTimer = 0;

  const dx = player.x - monster.x;
  const dy = player.y - monster.y;

  const distance = Math.hypot(dx, dy);

  if (distance > 0.1) {
    const step = speed * interval;

    const nextX = monster.x + (dx / distance) * step;
    const nextY = monster.y + (dy / distance) * step;

    if (canMove(nextX, monster.y)) {
      monster.x = nextX;
    }

    if (canMove(monster.x, nextY)) {
      monster.y = nextY;
    }
  }

  if (distance < 0.55) {
    caught();
  }
}


// RAYCASTING

function castRay(angle) {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
  const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

  let stepX;
  let stepY;
  let sideDistX;
  let sideDistY;

  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (player.x - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - player.x) * deltaDistX;
  }

  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (player.y - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - player.y) * deltaDistY;
  }

  let side = 0;
  let hit = false;

  // Start at zero so the raycasting loop can run.
  let distance = 0;

  while (!hit && distance < 20) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
      distance = sideDistX - deltaDistX;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
      distance = sideDistY - deltaDistY;
    }

    if (
      mapY < 0 || mapY >= map.length ||
      mapX < 0 || mapX >= map[0].length
    ) {
      hit = true;
    } else if (map[mapY][mapX] === "#") {
      hit = true;
    }
  }

  return {
    distance: Math.max(distance, 0.01),
    side
  };
}


// DRAW THE SCHOOL ENVIRONMENT


function renderScene() {
  const width = canvas.width;
  const height = canvas.height;

  const depthBuffer = new Array(width);

  // Ceiling
  const ceiling = ctx.createLinearGradient(
    0, 0, 0, height / 2
  );

  ceiling.addColorStop(0, "#101116");
  ceiling.addColorStop(1, "#38343a");

  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, width, height / 2);

  // Floor
  const floor = ctx.createLinearGradient(
    0, height / 2, 0, height
  );

  floor.addColorStop(0, "#393238");
  floor.addColorStop(1, "#101014");

  ctx.fillStyle = floor;
  ctx.fillRect(0, height / 2, width, height / 2);

  // Draw walls
  for (let x = 0; x < width; x++) {
    const rayAngle =
      player.angle - FOV / 2 + (x / width) * FOV;

    const ray = castRay(rayAngle);

    const correctedDistance =
      ray.distance * Math.cos(rayAngle - player.angle);

    depthBuffer[x] = correctedDistance;

    const wallHeight = Math.min(
      height,
      height / Math.max(correctedDistance, 0.1)
    );

    const top = (height - wallHeight) / 2;

    let shade = Math.max(
      85,
      230 - correctedDistance * 14
    );

    if (ray.side === 1) shade *= 0.85;
    if (!flashlight) shade *= 0.65;

    shade = Math.min(230, shade);

    ctx.fillStyle =
      `rgb(${shade}, ${shade * 0.88}, ${shade * 0.82})`;

    ctx.fillRect(x, top, 1, wallHeight);
  }

  // Draw the school furniture.
  drawSchoolProps(depthBuffer);

  // Threat warning glow
  const monsterDistance = Math.hypot(
    monster.x - player.x,
    monster.y - player.y
  );

  if (monsterDistance < 4) {
    const danger = ctx.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      width * 0.7
    );

    danger.addColorStop(0, "rgba(110, 0, 0, 0)");
    danger.addColorStop(
      1,
      `rgba(130, 0, 0, ${0.35 / monsterDistance})`
    );

    ctx.fillStyle = danger;
    ctx.fillRect(0, 0, width, height);
  }

  // Flashlight
  if (flashlight) {
    const light = ctx.createRadialGradient(
      width / 2,
      height / 2,
      35,
      width / 2,
      height / 2,
      width * 0.65
    );

    light.addColorStop(0, "rgba(0,0,0,0)");
    light.addColorStop(1, "rgba(0,0,0,0.35)");

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, width, height);
  }
}


  // Store wall distances so furniture can be hidden behind walls.
  const depthBuffer = new Array(width);

  // Draw hallway walls
  for (let x = 0; x < width; x++) {
    const rayAngle =
      player.angle - FOV / 2 + (x / width) * FOV;

    const ray = castRay(rayAngle);

    const correctedDistance =
      ray.distance * Math.cos(rayAngle - player.angle);

    depthBuffer[x] = correctedDistance;

    const wallHeight = Math.min(
      height,
      height / Math.max(correctedDistance, 0.1)
    );

    const top = (height - wallHeight) / 2;

    // Brighter wall lighting
    let shade = Math.max(
      85,
      230 - correctedDistance * 14
    );

    if (ray.side === 1) {
      shade *= 0.85;
    }

    if (!flashlight) {
      shade *= 0.65;
    }

    shade = Math.min(230, shade);

    ctx.fillStyle =
      `rgb(${shade}, ${shade * 0.88}, ${shade * 0.82})`;

    ctx.fillRect(x, top, 1, wallHeight);
  }

  // Draw school furniture and wall decorations.
  drawSchoolProps(depthBuffer);

  // Red warning glow when the threat is nearby
  const monsterDistance = Math.hypot(
    monster.x - player.x,
    monster.y - player.y
  );

  if (monsterDistance < 4) {
    const danger = ctx.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      width * 0.7
    );

    danger.addColorStop(
      0,
      "rgba(110, 0, 0, 0)"
    );

    danger.addColorStop(
      1,
      `rgba(130, 0, 0, ${0.35 / monsterDistance})`
    );

    ctx.fillStyle = danger;
    ctx.fillRect(0, 0, width, height);
  }

  // Flashlight lighting
  if (flashlight) {
    const light = ctx.createRadialGradient(
      width / 2,
      height / 2,
      35,
      width / 2,
      height / 2,
      width * 0.65
    );

    light.addColorStop(0, "rgba(0,0,0,0)");
    light.addColorStop(1, "rgba(0,0,0,0.35)");

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

  } else {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, width, height);
  }
}


// MAIN GAME LOOP

function gameLoop(timestamp) {
  if (!gameRunning) return;

  const delta = Math.min(
    (timestamp - lastTime) / 1000,
    0.05
  );

  lastTime = timestamp;

  // Use the actual Shift key codes.
  const running =
    keysDown.ShiftLeft || keysDown.ShiftRight;

  const speed = crouching
    ? 1.4
    : running
      ? 3.5
      : 2.3;

  const step = speed * delta;

  let forward = 0;
  let sideways = 0;

  if (keysDown.KeyW) forward += step;
  if (keysDown.KeyS) forward -= step;
  if (keysDown.KeyA) sideways -= step;
  if (keysDown.KeyD) sideways += step;

  const moveX =
    Math.cos(player.angle) * forward +
    Math.cos(player.angle + Math.PI / 2) * sideways;

  const moveY =
    Math.sin(player.angle) * forward +
    Math.sin(player.angle + Math.PI / 2) * sideways;

  movePlayer(moveX, moveY);

  updateMonster(delta);
  renderScene();

  if (messageTimer > 0) {
    messageTimer -= delta;

    if (messageTimer <= 0) {
      document.getElementById("message").classList.add("hidden");
    }
  }

  requestAnimationFrame(gameLoop);
}


// MENU BUTTONS

document.getElementById("newGame").addEventListener("click", () => {
  showScreen("difficulty");
});

document.querySelectorAll("[data-difficulty]").forEach(button => {
  button.addEventListener("click", () => {
    startNewGame(button.dataset.difficulty);
  });
});

document.getElementById("begin").addEventListener(
  "click",
  beginGame
);

document.getElementById("continueGame").addEventListener(
  "click",
  loadGame
);

document.getElementById("settingsButton").addEventListener(
  "click",
  () => showScreen("settings")
);

document.getElementById("backFromSettings").addEventListener(
  "click",
  () => showScreen("menu")
);

document.getElementById("soundToggle").addEventListener(
  "change",
  event => {
    soundOn = event.target.checked;
  }
);

document.getElementById("restart").addEventListener(
  "click",
  () => startNewGame(difficulty)
);

document.getElementById("playAgain").addEventListener(
  "click",
  () => showScreen("difficulty")
);

document.getElementById("mainMenu").addEventListener(
  "click",
  () => showScreen("menu")
);

document.getElementById("endingMenu").addEventListener(
  "click",
  () => showScreen("menu")
);


// KEYBOARD CONTROLS

window.addEventListener("keydown", event => {
  if (!gameRunning) return;

  const key = event.key.toLowerCase();

  if ([
    "w", "a", "s", "d",
    "arrowup", "arrowdown",
    "arrowleft", "arrowright",
    "shift"
  ].includes(key)) {
    event.preventDefault();
  }

  keysDown[event.code] = true;

  if (key === "e" && !event.repeat) {
    interact();
  }

  if (key === "f" && !event.repeat) {
    flashlight = !flashlight;

    showMessage(
      flashlight ? "Flashlight on." : "Flashlight off."
    );
  }

  if (key === "c" && !event.repeat) {
    crouching = !crouching;

    showMessage(
      crouching ? "You crouch down." : "You stand up."
    );
  }
});

window.addEventListener("keyup", event => {
  keysDown[event.code] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keysDown).forEach(key => {
    keysDown[key] = false;
  });
});


// MOUSE LOOK

canvas.addEventListener("click", () => {
  if (gameRunning && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
});

document.addEventListener("mousemove", event => {
  if (gameRunning && document.pointerLockElement === canvas) {
    player.angle += event.movementX * 0.003;
  }
});


// INITIAL MENU SETUP

document.getElementById("continueGame").disabled =
  !localStorage.getItem(SAVE_NAME);

showMessage("Welcome to The Last Bell.", 3);

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
// ------------------------------------------------------------
// SCHOOL DECORATIONS: 3D-LOOKING OBJECTS
// ------------------------------------------------------------

const schoolProps = [
  // Starting hallway
  { x: 3.7, y: 1.55, type: "lockers", scale: 1.05 },
  { x: 4.55, y: 2.35, type: "waterFountain", scale: 0.72 },
  { x: 2.9, y: 2.65, type: "trashCan", scale: 0.72 },

  // Classrooms and hallways
  { x: 2.2, y: 4.35, type: "desk", scale: 0.9 },
  { x: 3.1, y: 4.4, type: "chair", scale: 0.82 },
  { x: 8.7, y: 1.65, type: "lockers", scale: 0.95 },
  { x: 9.65, y: 3.7, type: "clock", scale: 0.58 },
  { x: 8.6, y: 4.35, type: "desk", scale: 0.92 },
  { x: 9.55, y: 4.25, type: "chair", scale: 0.8 },

  // Other rooms
  { x: 1.7, y: 7.5, type: "cabinet", scale: 0.95 },
  { x: 2.8, y: 8.5, type: "desk", scale: 0.9 },
  { x: 3.7, y: 8.55, type: "chair", scale: 0.82 },
  { x: 8.55, y: 7.5, type: "lockers", scale: 0.9 },
  { x: 9.6, y: 7.2, type: "poster", scale: 0.72 },
  { x: 2.3, y: 10.2, type: "trashCan", scale: 0.7 },
  { x: 8.5, y: 10.2, type: "cabinet", scale: 0.88 }
];

const propSprites = {};

function makeSchoolProp(type) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 190;

  const g = c.getContext("2d");

  // Ground shadow
  g.fillStyle = "rgba(0,0,0,0.42)";
  g.beginPath();
  g.ellipse(82, 174, 54, 10, 0, 0, Math.PI * 2);
  g.fill();

  g.lineJoin = "round";
  g.lineCap = "round";

  // LOCKERS
  if (type === "lockers") {
    g.fillStyle = "#202c39";
    g.beginPath();
    g.moveTo(119, 30);
    g.lineTo(137, 40);
    g.lineTo(137, 157);
    g.lineTo(119, 166);
    g.closePath();
    g.fill();

    g.fillStyle = "#52677c";
    g.fillRect(25, 27, 94, 139);

    g.fillStyle = "#34485d";
    g.fillRect(25, 27, 94, 9);

    for (let i = 0; i < 3; i++) {
      const x = 29 + i * 30;

      g.fillStyle = i % 2 ? "#60788e" : "#71869a";
      g.fillRect(x, 39, 26, 121);

      g.strokeStyle = "#263747";
      g.lineWidth = 2;
      g.strokeRect(x, 39, 26, 121);

      g.fillStyle = "#263747";

      for (let v = 0; v < 4; v++) {
        g.fillRect(x + 5, 49 + v * 5, 15, 2);
      }

      g.fillStyle = "#c0a875";
      g.fillRect(x + 19, 94, 3, 13);
    }

    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(28, 40, 3, 115);
  }

  // DESKS
  if (type === "desk") {
    g.fillStyle = "#252a30";
    g.fillRect(42, 105, 9, 61);
    g.fillRect(111, 105, 9, 61);

    g.fillStyle = "#111820";
    g.fillRect(39, 160, 16, 5);
    g.fillRect(108, 160, 16, 5);

    g.fillStyle = "#704a31";
    g.beginPath();
    g.moveTo(25, 83);
    g.lineTo(111, 83);
    g.lineTo(139, 96);
    g.lineTo(53, 98);
    g.closePath();
    g.fill();

    g.fillStyle = "#a8784d";
    g.beginPath();
    g.moveTo(25, 83);
    g.lineTo(111, 83);
    g.lineTo(111, 96);
    g.lineTo(25, 96);
    g.closePath();
    g.fill();

    g.fillStyle = "#4d3022";
    g.beginPath();
    g.moveTo(111, 83);
    g.lineTo(139, 96);
    g.lineTo(139, 108);
    g.lineTo(111, 96);
    g.closePath();
    g.fill();

    g.strokeStyle = "#d0a071";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(30, 85);
    g.lineTo(106, 85);
    g.stroke();

    // Notebook on the desk
    g.fillStyle = "#d6d2c4";
    g.beginPath();
    g.moveTo(56, 68);
    g.lineTo(91, 68);
    g.lineTo(103, 75);
    g.lineTo(68, 75);
    g.closePath();
    g.fill();

    g.strokeStyle = "#77736b";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(62, 70);
    g.lineTo(90, 70);
    g.stroke();
  }

  // CHAIRS
  if (type === "chair") {
    g.fillStyle = "#263746";
    g.beginPath();
    g.moveTo(48, 48);
    g.lineTo(111, 48);
    g.lineTo(119, 103);
    g.lineTo(55, 103);
    g.closePath();
    g.fill();

    g.fillStyle = "#526f83";
    g.beginPath();
    g.moveTo(53, 53);
    g.lineTo(106, 53);
    g.lineTo(112, 96);
    g.lineTo(59, 96);
    g.closePath();
    g.fill();

    g.fillStyle = "#17232d";
    g.fillRect(56, 108, 8, 58);
    g.fillRect(107, 108, 8, 58);

    g.fillStyle = "#354d5f";
    g.beginPath();
    g.moveTo(42, 101);
    g.lineTo(108, 101);
    g.lineTo(130, 112);
    g.lineTo(65, 115);
    g.closePath();
    g.fill();

    g.fillStyle = "#6e8797";
    g.beginPath();
    g.moveTo(42, 101);
    g.lineTo(108, 101);
    g.lineTo(108, 111);
    g.lineTo(42, 111);
    g.closePath();
    g.fill();
  }

  // TRASH CAN
  if (type === "trashCan") {
    g.fillStyle = "#26343b";
    g.beginPath();
    g.moveTo(49, 67);
    g.lineTo(111, 67);
    g.lineTo(103, 158);
    g.lineTo(57, 158);
    g.closePath();
    g.fill();

    g.fillStyle = "#53666c";
    g.beginPath();
    g.moveTo(49, 67);
    g.lineTo(111, 67);
    g.lineTo(106, 83);
    g.lineTo(54, 83);
    g.closePath();
    g.fill();

    g.fillStyle = "#718187";
    g.fillRect(57, 85, 6, 65);

    g.fillStyle = "#18242a";
    g.fillRect(74, 91, 4, 58);
    g.fillRect(91, 91, 4, 58);

    g.fillStyle = "#9aa5a5";
    g.fillRect(68, 58, 27, 8);
  }

  // WATER FOUNTAIN
  if (type === "waterFountain") {
    g.fillStyle = "#25323a";
    g.beginPath();
    g.moveTo(48, 70);
    g.lineTo(111, 70);
    g.lineTo(119, 144);
    g.lineTo(41, 144);
    g.closePath();
    g.fill();

    g.fillStyle = "#9baeb3";
    g.fillRect(48, 65, 63, 13);

    g.fillStyle = "#647d84";
    g.beginPath();
    g.moveTo(55, 83);
    g.lineTo(105, 83);
    g.lineTo(98, 111);
    g.lineTo(62, 111);
    g.closePath();
    g.fill();

    g.strokeStyle = "#c3d0cf";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(79, 58);
    g.lineTo(79, 69);
    g.stroke();

    g.fillStyle = "#d4e0df";
    g.fillRect(75, 53, 9, 5);

    g.fillStyle = "#26343b";
    g.fillRect(51, 117, 58, 20);

    g.fillStyle = "#82999e";
    g.fillRect(58, 122, 44, 4);
  }

  // WALL CLOCK
  if (type === "clock") {
    g.fillStyle = "#252b30";
    g.beginPath();
    g.ellipse(82, 95, 48, 52, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#d8d5c7";
    g.beginPath();
    g.ellipse(82, 95, 40, 44, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = "#77776d";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(82, 95, 35, 39, 0, 0, Math.PI * 2);
    g.stroke();

    g.strokeStyle = "#252525";
    g.lineWidth = 4;

    g.beginPath();
    g.moveTo(82, 95);
    g.lineTo(82, 66);
    g.stroke();

    g.beginPath();
    g.moveTo(82, 95);
    g.lineTo(104, 106);
    g.stroke();

    g.fillStyle = "#222";
    g.beginPath();
    g.arc(82, 95, 5, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#333";
    g.font = "bold 11px Arial";
    g.textAlign = "center";
    g.fillText("12", 82, 63);
    g.fillText("6", 82, 135);
  }

  // SCHOOL POSTER
  if (type === "poster") {
    g.fillStyle = "#362a25";
    g.fillRect(38, 28, 91, 129);

    g.fillStyle = "#e4ddc6";
    g.fillRect(44, 34, 79, 117);

    g.fillStyle = "#8b3732";
    g.fillRect(50, 43, 67, 29);

    g.fillStyle = "#f1e7d0";
    g.font = "bold 10px Arial";
    g.textAlign = "center";
    g.fillText("SCHOOL", 83, 55);
    g.fillText("SAFETY", 83, 66);

    g.fillStyle = "#455b54";
    g.fillRect(57, 83, 52, 5);
    g.fillRect(57, 95, 45, 4);
    g.fillRect(57, 106, 49, 4);

    g.fillStyle = "#9a8a6c";
    g.fillRect(57, 122, 52, 17);
  }

  // CABINET
  if (type === "cabinet") {
    g.fillStyle = "#202a30";
    g.beginPath();
    g.moveTo(35, 40);
    g.lineTo(113, 40);
    g.lineTo(128, 51);
    g.lineTo(128, 158);
    g.lineTo(35, 158);
    g.closePath();
    g.fill();

    g.fillStyle = "#66716f";
    g.fillRect(35, 40, 78, 118);

    g.fillStyle = "#485552";
    g.fillRect(39, 46, 33, 105);
    g.fillRect(76, 46, 33, 105);

    g.strokeStyle = "#202a30";
    g.lineWidth = 3;
    g.strokeRect(39, 46, 33, 105);
    g.strokeRect(76, 46, 33, 105);

    g.fillStyle = "#c0a875";
    g.fillRect(65, 94, 4, 14);
    g.fillRect(102, 94, 4, 14);

    g.fillStyle = "#7f8b85";
    g.fillRect(35, 40, 78, 7);
  }

  return c;
}

// CREATE THE SCHOOL OBJECT IMAGES

for (const type of [
  "lockers",
  "desk",
  "chair",
  "trashCan",
  "waterFountain",
  "clock",
  "poster",
  "cabinet"
]) {
  propSprites[type] = makeSchoolProp(type);
}

// DRAW OBJECTS IN THE 3D-LOOKING WORLD

function drawSchoolProps(depthBuffer) {
  const width = canvas.width;
  const height = canvas.height;

  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);

  const visible = schoolProps.map(prop => {
    const dx = prop.x - player.x;
    const dy = prop.y - player.y;

    const depth = dx * cos + dy * sin;
    const side = -dx * sin + dy * cos;

    return { prop, depth, side };

  }).filter(item => item.depth > 0.18)
    .sort((a, b) => b.depth - a.depth);

  for (const item of visible) {
    const { prop, depth, side } = item;

    const sprite = propSprites[prop.type];

    if (!sprite) continue;

    const correctedDepth = depth;

    const screenX = width / 2 +
      (side / correctedDepth) *
      (width / (2 * Math.tan(FOV / 2)));

    const spriteHeight = Math.min(
      height * 2,
      (height / correctedDepth) * 0.78 * prop.scale
    );

    const spriteWidth =
      spriteHeight * (sprite.width / sprite.height);

    const left = Math.round(screenX - spriteWidth / 2);
    const right = Math.round(screenX + spriteWidth / 2);

    const top = Math.round(height / 2 - spriteHeight * 0.52);
    const bottom = Math.round(top + spriteHeight);

    if (right < 0 || left >= width) continue;

    // Walls hide objects that are behind them.
    for (
      let screenColumn = Math.max(0, left);
      screenColumn < Math.min(width, right);
      screenColumn++
    ) {
      if (correctedDepth >= depthBuffer[screenColumn]) {
        continue;
      }

      const textureX = Math.floor(
        ((screenColumn - left) /
        Math.max(1, right - left)) * sprite.width
      );

      ctx.drawImage(
        sprite,
        textureX, 0, 1, sprite.height,
        screenColumn, top, 1, bottom - top
      );
    }
  }
}
// DRAW THE SCHOOL ENVIRONMENT

function renderScene() {
  const width = canvas.width;
  const height = canvas.height;

  const depthBuffer = new Float32Array(width);

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

  // Walls and depth buffer
  for (let x = 0; x < width; x++) {
    const rayAngle =
      player.angle - FOV / 2 + (x / width) * FOV;

    const ray = castRay(rayAngle);

    const correctedDistance = Math.max(
      0.05,
      ray.distance * Math.cos(rayAngle - player.angle)
    );

    depthBuffer[x] = correctedDistance;

    const wallHeight = Math.min(
      height * 2,
      height / correctedDistance
    );

    const top = (height - wallHeight) / 2;

    let shade = Math.max(
      65,
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

    // Subtle wall seams
    if (wallHeight > 18 && x % 7 === 0) {
      ctx.fillStyle =
        `rgba(25, 22, 25, ${Math.min(
          0.22,
          0.08 + 0.1 / correctedDistance
        )})`;

      ctx.fillRect(
        x,
        top + wallHeight * 0.68,
        1,
        Math.max(1, wallHeight * 0.008)
      );
    }
  }

  // Draw the school furniture
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
      `rgba(130, 0, 0, ${Math.min(
        0.45,
        0.35 / Math.max(0.5, monsterDistance)
      )})`
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
  if (
    gameRunning &&
    document.pointerLockElement !== canvas
  ) {
    canvas.requestPointerLock?.();
  }
});

document.addEventListener("mousemove", event => {
  if (
    gameRunning &&
    document.pointerLockElement === canvas
  ) {
    player.angle += event.movementX * 0.003;
  }
});

// INITIAL MENU SETUP

document.getElementById("continueGame").disabled =
  !localStorage.getItem(SAVE_NAME);

showMessage("Welcome to The Last Bell.", 3);

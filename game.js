
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
  { x: 4.5, y: 1.5, type: "note", name: "Old Staff Note", text: "The staff kept reporting strange noises from the basement.", found: false },
  { x: 9.5, y: 2.5, type: "key", name: "Office Key", text: "You found the office key.", found: false },
  { x: 1.5, y: 6.5, type: "note", name: "Missing Staff File", text: "Three former employees disappeared. The principal closed the investigation.", found: false },
  { x: 9.5, y: 8.5, type: "key", name: "Basement Key", text: "You found the basement key.", found: false },
  { x: 10.5, y: 10.5, type: "exit", name: "School Exit", text: "The exit is locked. Find both keys and all the clues.", found: false }
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

function showScreen(id) {
  screens.forEach(name => {
    document.getElementById(name).classList.add("hidden");
  });
  if (id) document.getElementById(id).classList.remove("hidden");
}

function showMessage(text, seconds = 3) {
  const box = document.getElementById("message");
  box.textContent = text;
  box.classList.remove("hidden");
  messageTimer = seconds;
}

function playTone(frequency = 120, duration = 0.12) {
  if (!soundOn) return;

  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
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
    // The game still works if browser audio is unavailable.
  }
}

function startNewGame(selectedDifficulty) {
  difficulty = selectedDifficulty;
  player = { x: 2.5, y: 1.5, angle: 0 };
  score = 0;
  keysFound = 0;
  cluesFound = 0;
  flashlight = true;
  crouching = false;
  monster = { x: 8.5, y: 9.5 };
  monsterTimer = 0;

  objects.forEach(object => object.found = false);

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

function beginGame() {
  showScreen(null);
  gameRunning = true;
  lastTime = performance.now();
  canvas.requestPointerLock?.();
  playTone(90, 0.25);
  requestAnimationFrame(gameLoop);
}

function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);

  if (my < 0 || my >= map.length || mx < 0 || mx >= map[0].length) {
    return true;
  }
  return map[my][mx] === "#";
}

function canMove(x, y) {
  const radius = 0.18;
  return !isWall(x - radius, y - radius) &&
         !isWall(x + radius, y - radius) &&
         !isWall(x - radius, y + radius) &&
         !isWall(x + radius, y + radius);
}

function movePlayer(dx, dy) {
  if (canMove(player.x + dx, player.y)) {
    player.x += dx;
  }
  if (canMove(player.x, player.y + dy)) {
    player.y += dy;
  }
}

function updateHUD() {
  document.getElementById("inventory").textContent =
    `Inventory: ${keysFound} keys · ${cluesFound} clues`;

  document.getElementById("score").textContent = `Score: ${score}`;

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
      showMessage("The exit is locked. Find both keys and both clues.");
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
  playTone(nearest.type === "key" ? 520 : 340, 0.2);
  updateHUD();
  saveGame();
}

function finishGame() {
  gameRunning = false;
  localStorage.removeItem(SAVE_NAME);
  document.exitPointerLock?.();

  document.getElementById("endingText").textContent =
    `You escaped with ${score} points. The principal's secret is finally exposed. ` +
    "But as the sun rises, one classroom light switches on by itself.";

  document.getElementById("hud").classList.add("hidden");
  document.getElementById("crosshair").classList.add("hidden");
  showScreen("ending");
  playTone(620, 0.5);
}

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

    if (canMove(nextX, monster.y)) monster.x = nextX;
    if (canMove(monster.x, nextY)) monster.y = nextY;
  }

  if (distance < 0.55) {
    caught();
  }
}

function castRay(angle) {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
  const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

  let stepX, stepY, sideDistX, sideDistY;

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
  let distance = 20;

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

  return { distance: Math.max(distance, 0.01), side };
}

function renderScene() {
  const width = canvas.width;
  const height = canvas.height;

  const ceiling = ctx.createLinearGradient(0, 0, 0, height / 2);
  ceiling.addColorStop(0, "#050609");
  ceiling.addColorStop(1, "#24232a");
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, width, height / 2);

  const floor = ctx.createLinearGradient(0, height / 2, 0, height);
  floor.addColorStop(0, "#242126");
  floor.addColorStop(1, "#050506");
  ctx.fillStyle = floor;
  ctx.fillRect(0, height / 2, width, height / 2);

  for (let x = 0; x < width; x++) {
    const rayAngle = player.angle - FOV / 2 + (x / width) * FOV;
    const ray = castRay(rayAngle);
    const correctedDistance = ray.distance *
      Math.cos(rayAngle - player.angle);

    const wallHeight = Math.min(
      height,
      height / Math.max(correctedDistance, 0.1)
    );

    const top = (height - wallHeight) / 2;
    let shade = Math.max(25, 190 - correctedDistance * 25);

    if (ray.side === 1) shade *= 0.72;
    if (!flashlight) shade *= 0.4;

    ctx.fillStyle = `rgb(${shade}, ${shade * 0.88}, ${shade * 0.82})`;
    ctx.fillRect(x, top, 1, wallHeight);
  }

  // A faint red glow warns the player when the threat is close.
  const monsterDistance = Math.hypot(
    monster.x - player.x,
    monster.y - player.y
  );

  if (monsterDistance < 4) {
    const danger = ctx.createRadialGradient(
      width / 2, height / 2, 10,
      width / 2, height / 2, width * 0.7
    );
    danger.addColorStop(0, "rgba(110, 0, 0, 0)");
    danger.addColorStop(1, `rgba(130, 0, 0, ${0.35 / monsterDistance})`);
    ctx.fillStyle = danger;
    ctx.fillRect(0, 0, width, height);
  }

  // Flashlight darkens the edges of the screen.
  if (flashlight) {
    const light = ctx.createRadialGradient(
      width / 2, height / 2, 35,
      width / 2, height / 2, width * 0.65
    );
    light.addColorStop(0, "rgba(0,0,0,0)");
    light.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, width, height);
  }
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  const running = keysDown.Shift;
  const speed = crouching ? 1.4 : running ? 3.5 : 2.3;
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

document.getElementById("begin").addEventListener("click", beginGame);

document.getElementById("continueGame").addEventListener("click", loadGame);

document.getElementById("settingsButton").addEventListener("click", () => {
  showScreen("settings");
});

document.getElementById("backFromSettings").addEventListener("click", () => {
  showScreen("menu");
});

document.getElementById("soundToggle").addEventListener("change", event => {
  soundOn = event.target.checked;
});

document.getElementById("restart").addEventListener("click", () => {
  startNewGame(difficulty);
});

document.getElementById("playAgain").addEventListener("click", () => {
  showScreen("difficulty");
});

document.getElementById("mainMenu").addEventListener("click", () => {
  showScreen("menu");
});

document.getElementById("endingMenu").addEventListener("click", () => {
  showScreen("menu");
});

// KEYBOARD CONTROLS

window.addEventListener("keydown", event => {
  keysDown[event.code] = true;

  if (!gameRunning) return;

  if (event.code === "KeyE" && !event.repeat) {
    interact();
  }

  if (event.code === "KeyF" && !event.repeat) {
    flashlight = !flashlight;
    showMessage(flashlight ? "Flashlight on." : "Flashlight off.");
    playTone(flashlight ? 400 : 180, 0.1);
  }

  if (event.code === "KeyC" && !event.repeat) {
    crouching = !crouching;
    showMessage(crouching ? "You crouch down." : "You stand up.");
  }

  if (event.code === "Escape") {
    showMessage("Press the game screen to control the mouse again.");
  }
});

window.addEventListener("keyup", event => {
  keysDown[event.code] = false;
});

// MOUSE LOOK

document.addEventListener("mousemove", event => {
  if (gameRunning && document.pointerLockElement === canvas) {
    player.angle += event.movementX * 0.0025;
  }
});

canvas.addEventListener("click", () => {
  if (gameRunning && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
});

// INITIAL MENU SETUP

document.getElementById("continueGame").disabled =
  !localStorage.getItem(SAVE_NAME);

showMessage("Welcome to The Last Bell.", 3);

alert("THE LAST BELL GAME.JS IS WORKING!");
// FIXED KEYBOARD CONTROLS

canvas.tabIndex = 0;

window.addEventListener("keydown", event => {
  if (!gameRunning) return;

  const key = event.key.toLowerCase();

  // Movement
  if (["w", "a", "s", "d", "shift"].includes(key)) {
    event.preventDefault();
  }

  keysDown[event.code] = true;

  if (key === "shift") {
    keysDown.Shift = true;
  }

  // Interact
  if (key === "e" && !event.repeat) {
    interact();
  }

  // Flashlight
  if (key === "f" && !event.repeat) {
    flashlight = !flashlight;
    showMessage(flashlight ? "Flashlight on." : "Flashlight off.");
    playTone(flashlight ? 400 : 180, 0.1);
  }

  // Crouch
  if (key === "c" && !event.repeat) {
    crouching = !crouching;
    showMessage(crouching ? "You crouch down." : "You stand up.");
  }
});

window.addEventListener("keyup", event => {
  keysDown[event.code] = false;

  if (event.key.toLowerCase() === "shift") {
    keysDown.Shift = false;
  }
});

// MOUSE CONTROLS

canvas.addEventListener("click", () => {
  if (!gameRunning) return;

  canvas.focus();

  if (document.pointerLockElement !== canvas) {
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

// RELEASE MOVEMENT KEYS WHEN THE WINDOW LOSES FOCUS

window.addEventListener("blur", () => {
  Object.keys(keysDown).forEach(key => {
    keysDown[key] = false;
  });
});

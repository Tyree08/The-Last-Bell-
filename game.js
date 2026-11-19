
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
  })
    .filter(item => item.depth > 0.18)
    .sort((a, b) => b.depth - a.depth);

  for (const item of visible) {
    const { prop, depth, side } = item;
    const sprite = propSprites[prop.type];
    if (!sprite) continue;

    const screenX = width / 2 +
      (side / depth) * (width / (2 * Math.tan(FOV / 2)));

    const spriteHeight = Math.min(
      height * 2,
      (height / depth) * 0.78 * prop.scale
    );

    const spriteWidth =
      spriteHeight * (sprite.width / sprite.height);

    const left = Math.round(screenX - spriteWidth / 2);
    const right = Math.round(screenX + spriteWidth / 2);

    // Position objects against the projected floor.
    const floorY = height / 2 + height / (2 * depth);

    let top;

    if (prop.type === "clock" || prop.type === "poster") {
      top = Math.round(height / 2 - spriteHeight * 0.65);
    } else {
      top = Math.round(floorY - spriteHeight);
    }

    const bottom = Math.round(top + spriteHeight);

    if (right < 0 || left >= width) continue;

    for (
      let screenColumn = Math.max(0, left);
      screenColumn < Math.min(width, right);
      screenColumn++
    ) {
      if (depth >= depthBuffer[screenColumn]) continue;

      const textureX = Math.floor(
        ((screenColumn - left) / Math.max(1, right - left)) *
        sprite.width
      );

      ctx.drawImage(
        sprite,
        textureX, 0, 1, sprite.height,
        screenColumn, top, 1, bottom - top
      );
    }
  }
}

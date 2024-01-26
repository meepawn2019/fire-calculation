const handleMouseMove = (e) => {
  e.preventDefault();
  e.stopPropagation();

  // if we're not dragging, just return
  if (!isDown) {
    return;
  }

  // get the current mouse position
  mouseX = parseInt(e.clientX - offsetX);
  mouseY = parseInt(e.clientY - offsetY);

  // Put your mousemove stuff here

  // calculate the rectangle width/height based
  // on starting vs current mouse position
  var width = mouseX - startX;
  var height = mouseY - startY;

  // clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw a new rect from the start position
  // to the current mouse position
  ctx.strokeRect(startX, startY, width, height);

  prevStartX = startX;
  prevStartY = startY;

  prevWidth = width;
  prevHeight = height;
};

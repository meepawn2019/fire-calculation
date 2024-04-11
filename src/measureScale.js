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

export const testTrigger = () => {
  const testButton = document.getElementById('test-btn');
  testButton.addEventListener('click', () => {
    const dialog = document.getElementById('scale-input-dialog');
    // if dialog has class inactive, remove it
    if (dialog.classList.contains('inactive')) {
      dialog.classList.remove('inactive');
      dialog.classList.add('active');
    } else {
      dialog.classList.remove('active');
      dialog.classList.add('inactive');
    }
  });
};

export const submitScale = (measureValue, canvaMeasureValue, isMeasureScale, setScale) => {
  const submitBtn = document.getElementById('scale-input-btn');
  let scale;
  submitBtn.addEventListener('click', () => {
    isMeasureScale = false;
    const measureBtn = document.getElementById("measure-scale-btn");
    measureBtn.classList.remove('active');
    const dialog = document.getElementById('scale-input-dialog');
    // inactivate dialog
    dialog.classList.remove('active');
    dialog.classList.add('inactive');
    measureValue = document.getElementById('scale-input').value;
    setScale(canvaMeasureValue/measureValue);
  });
  return scale;
}
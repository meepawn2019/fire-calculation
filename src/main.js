import { submitScale, test, testTrigger } from "./measureScale";
import { addFireBtn } from "./fireBtn";
import fireImage from './assets/fire-48.png';

const { invoke } = window.__TAURI__.tauri;

let greetInputEl;
let greetMsgEl;
let isDrawing;
let isAddFireMode;
let isMovingFireMode;
let prevX = 0;
let currX = 0;
let prevY = 0;
let currY = 0;
let isMeasureScale = false;
let drawingCanvas;
let canvasContainer;
let measureValue;
let canvaMeasureValue;
const firePosition = [];
let fireImageObj;

// Load fire image
const image = new Image();
image.src = fireImage;
image.onload = () => {
  fireImageObj = image;
};

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  isDrawing = false;
  const fileInput = document.getElementById("file-input");
  const canvas = document.getElementById("pdf-canvas");
  drawingCanvas = document.getElementById("drawing-canvas");
  const fileName = document.getElementById("file-name");
  const uploadButton = document.getElementById("file-upload-btn");
  const clearButton = document.getElementById("clear-btn");
  canvasContainer = document.getElementById("canvas-container");
  uploadButtonListener(uploadButton, fileInput);
  clearButtonListener(clearButton, drawingCanvas);
  measureScaleBtnHandler();
  fileInput.addEventListener(
    "change",
    (evt) => handleFileSelect(evt, canvas, fileName),
    false
  );
  // Only add event listeners if file is uploaded
  if (!fileInput.value) {
    return;
  }
});

const draw = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currX, currY);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();
};

const drawRect = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  // ctx.lineTo(currX, prevY);
  // ctx.lineTo(currX, currY);
  ctx.lineTo(prevX, currY);
  // ctx.lineTo(prevX, prevY);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();
};

const findxy = (res, e, canvas) => {
  const ctx = canvas.getContext("2d");
  if (res == "down") {
    prevX = currX;
    prevY = currY - canvasContainer.offsetTop;
    currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
    currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
    // if (!isMeasureScale) {
    //   isDrawing = true;
    // }
    // If currX and currY in fire position, set isAddFireMode to true
    if (firePosition) {
      firePosition.forEach((fire) => {
        if (
          currX >= fire.x &&
          currX <= fire.x + fire.width &&
          currY >= fire.y &&
          currY <= fire.y + fire.height
        ) {
          console.log(12345);
          fire.isMoving = true;
          isMovingFireMode = true;
        }
      });
    }
  }
  if (res === "up") {
    isDrawing = false;
    if (isMeasureScale) {
      prevX = currX;
      prevY = currY;
      currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
      currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
      canvaMeasureValue = Math.abs(currY - prevY);
      drawRect(ctx);
      isMeasureScale = false;
      submitScale(measureValue, canvaMeasureValue);
      // show dialog
      const dialog = document.getElementById('scale-input-dialog');
      // if dialog has class inactive, remove it
      if (dialog.classList.contains('inactive')) {
        dialog.classList.remove('inactive');
        dialog.classList.add('active');
      }
    }
  }
  if (res == "up" || res == "out") {
    isDrawing = false;
    isMovingFireMode = false;
    firePosition.forEach((fire) => {
      fire.isMoving = false;
    });
  }
  // if (!(res == "move" && isDrawing)) {
  //   return;
  // }
  if (res === 'move' && isMovingFireMode) {
    console.log(456);
    prevX = currX;
    prevY = currY;
    currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
    currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
    const diffX = currX - prevX;
    const diffY = currY - prevY;
    console.log(diffX, diffY)
    const movingFire = firePosition.find((fire) => fire.isMoving);
    movingFire.x += diffX;
    movingFire.y += diffY;
    // firePosition.forEach((fire) => {
    //   fire.x += diffX;
    //   fire.y += diffY;
    // });
    // Clear the canvas
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    // Redraw the canvas
    console.log(firePosition);
    ctx.drawImage(fireImageObj, movingFire.x, movingFire.y);
    firePosition.forEach((fire) => {
      ctx.drawImage(fireImageObj, fire.x, fire.y);
    });
    return;
  }
  // prevX = currX;
  // prevY = currY;
  // currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
  // currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
  // if (!isMeasureScale) {
  //   draw(ctx);
  // }

  return {
    findxy,
  };
};

const handleFileSelect = async (evt, canvas, fileName) => {
  drawingCanvas.addEventListener("mousedown", (e) => findxy("down", e, drawingCanvas), true);
  drawingCanvas.addEventListener("mousemove", (e) => findxy("move", e, drawingCanvas), true);
  drawingCanvas.addEventListener("mouseup", (e) => findxy("up", e, drawingCanvas), true);
  drawingCanvas.addEventListener("mouseout", (e) => findxy("out", e, drawingCanvas), true);
  const files = evt.target.files; // FileList object
  const file = files[0];
  const fileReader = new FileReader();
  // Set file name
  fileName.textContent = file.name;
  fileReader.onload = async (e) => {
    const typedarray = new Uint8Array(e.target.result);
    const pdf = await pdfjsLib.getDocument(typedarray).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const context = canvas.getContext("2d");
    // resize the viewport to fit the canvas
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    drawingCanvas.height = viewport.height;
    drawingCanvas.width = viewport.width;
    const renderContext = {
      canvasContext: context,
      viewport,
    };
    page.render(renderContext);
    addFireBtn(drawingCanvas, firePosition, fireImageObj);
  };
  fileReader.readAsArrayBuffer(file);
};

const uploadButtonListener = async (uploadBtn, fileInput) => {
  uploadBtn.addEventListener("click", async () => {
    // Click the hidden input
    fileInput.click();
  });
};

const clearButtonListener = async (clearBtn, canvas) => {
  clearBtn.addEventListener("click", async () => {
    const context = drawingCanvas.getContext("2d");
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    // Clear the file name
    // const fileName = document.getElementById("file-name");
    // fileName.textContent = "";
    // const fileInput = document.getElementById("file-input");
    // fileInput.value = "";
    isMeasureScale = false;
    // Remove canvas event listeners
    // canvas.removeEventListener("mousedown", (e) => findxy("down", e, canvas), true);
    // canvas.removeEventListener("mousemove", (e) => findxy("move", e, canvas), true);
    // canvas.removeEventListener("mouseup", (e) => findxy("up", e, canvas), true);
    // canvas.removeEventListener("mouseout", (e) => findxy("out", e, canvas), true);
  });
}

const measureScaleBtnHandler = async () => {
  const measureBtn = document.getElementById("measure-scale-btn");
  measureBtn.addEventListener("click", async () => {
    isMeasureScale = !isMeasureScale;
    if (isMeasureScale) {
      measureBtn.classList.add("active");
    } else {
      measureBtn.classList.remove("active");
    }
  });
};

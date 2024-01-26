const { invoke } = window.__TAURI__.tauri;

let greetInputEl;
let greetMsgEl;
let isDrawing;
let prevX = 0;
let currX = 0;
let prevY = 0;
let currY = 0;
let isMeasureScale = false;

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
  const fileName = document.getElementById("file-name");
  const uploadButton = document.getElementById("file-upload-btn");
  const clearButton = document.getElementById("clear-btn");
  uploadButtonListener(uploadButton, fileInput);
  clearButtonListener(clearButton, canvas);
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
    prevY = currY;
    currX = e.pageX - canvas.offsetLeft;
    currY = e.pageY - canvas.offsetTop;
    if (!isMeasureScale) {
      isDrawing = true;
    }
  }
  if (res === "up") {
    isDrawing = false;
    if (isMeasureScale) {
      prevX = currX;
      prevY = currY;
      currX = e.pageX - canvas.offsetLeft;
      currY = e.pageY - canvas.offsetTop;
      drawRect(ctx);
      isMeasureScale = false;
    }
  }
  if (res == "up" || res == "out") {
    isDrawing = false;
    // if (isMeasureScale) {
    //   prevX = currX;
    //   prevY = currY;
    //   currX = e.pageX - canvas.offsetLeft;
    //   currY = e.pageY - canvas.offsetTop;
    //   drawRect(ctx);
    //   isMeasureScale = false;
    // }
  }
  if (!(res == "move" && isDrawing)) {
    return;
  }
  prevX = currX;
  prevY = currY;
  currX = e.pageX - canvas.offsetLeft;
  currY = e.pageY - canvas.offsetTop;
  if (!isMeasureScale) {
    draw(ctx);
  }

  return {
    findxy,
  };
};

const handleFileSelect = async (evt, canvas, fileName) => {
  canvas.addEventListener("mousedown", (e) => findxy("down", e, canvas), true);
  canvas.addEventListener("mousemove", (e) => findxy("move", e, canvas), true);
  canvas.addEventListener("mouseup", (e) => findxy("up", e, canvas), true);
  canvas.addEventListener("mouseout", (e) => findxy("out", e, canvas), true);
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
    const renderContext = {
      canvasContext: context,
      viewport,
    };
    page.render(renderContext);
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
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    // Clear the file name
    const fileName = document.getElementById("file-name");
    fileName.textContent = "";
    const fileInput = document.getElementById("file-input");
    fileInput.value = "";
    isMeasureScale = false;
    // Remove canvas event listeners
    canvas.removeEventListener("mousedown", (e) => findxy("down", e, canvas), true);
    canvas.removeEventListener("mousemove", (e) => findxy("move", e, canvas), true);
    canvas.removeEventListener("mouseup", (e) => findxy("up", e, canvas), true);
    canvas.removeEventListener("mouseout", (e) => findxy("out", e, canvas), true);
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

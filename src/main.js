import { submitScale } from "./measureScale";
import { WebviewWindow } from "@tauri-apps/api/window";
import fireImage from "./assets/fire-48.png";
import { getVersion } from '@tauri-apps/api/app';

const { invoke } = window.__TAURI__.tauri;


let greetInputEl;
let greetMsgEl;
let isDrawing;
let isMovingFireMode;
let prevX = 0;
let currX = 0;
let prevY = 0;
let currY = 0;
let isMeasureScale = false;
let drawingCanvas;
let canvasContainer;
let measureValue;
let scale;
let firePosition = [];
let pathPosition = [];
let measurePath = [];
let fireImageObj;
let isDrawPath = false;

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

const setScale = (calculated) => {
  scale = calculated;
};

window.addEventListener("DOMContentLoaded", async () => {
  // Load fire image
  const appVersion = await getVersion();
  console.log(appVersion, "appVersion")
  const versionEl = document.querySelector("#version");
  versionEl.textContent = appVersion;
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
  const image = new Image();
  image.src = fireImage;
  image.onload = () => {
    fireImageObj = image;
    addFireBtn(drawingCanvas);
  };
  uploadButtonListener(uploadButton, fileInput);
  clearButtonListener(clearButton, drawingCanvas);
  guideBtnHandler();
  drawPathBtnHandler();
  inputParamsHandler();
  inputParamsSubmitBtnHandler();
  calculateBtnHandler();
  measureScaleBtnHandler();
  handleExportBtn();
  drawingCanvas.addEventListener(
    "mousedown",
    (e) => findxy("down", e, drawingCanvas),
    true
  );
  drawingCanvas.addEventListener(
    "mousemove",
    (e) => findxy("move", e, drawingCanvas),
    true
  );
  drawingCanvas.addEventListener(
    "mouseup",
    (e) => findxy("up", e, drawingCanvas),
    true
  );
  drawingCanvas.addEventListener(
    "mouseout",
    (e) => findxy("out", e, drawingCanvas),
    true
  );
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

const addFireBtn = (drawringCanvas) => {
  const fireBtn = document.getElementById("fire-btn");
  fireBtn.addEventListener("click", () => {
    const ctx = drawringCanvas.getContext("2d");
    console.log(firePosition.length, "firePosition.length")
    if (firePosition.length > 0) {
      return;
    }
    // Add fire image in the center of the canvas
    ctx.drawImage(
      fireImageObj,
      drawringCanvas.width / 2 - fireImageObj.width / 2,
      drawringCanvas.height / 2 - fireImageObj.height / 2
    );
    firePosition.push({
      rank: firePosition.length + 1,
      x: drawringCanvas.width / 2 - fireImageObj.width / 2 + firePosition.length * 10,
      y: drawringCanvas.height / 2 - fireImageObj.height / 2,
      height: fireImageObj.height,
      width: fireImageObj.width,
    });
    return;
  });
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
    if (isMeasureScale) {
      currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
      currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
      measurePath.push({ x: currX, y: currY });
      return;
    }
    if (isDrawPath) {
      currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
      currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
      console.log(pathPosition);
      if (pathPosition === undefined || pathPosition.length === 0) {
        pathPosition.push({ x: currX, y: currY });
        return;
      }
      pathPosition.push({ x: currX, y: currY });
      drawEntities(ctx);
      return;
    }
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
      const diffX = currX - measurePath[0]?.x;
      const diffY = currY - measurePath[0]?.y;
      const length = Math.sqrt(diffX * diffX + diffY * diffY);
      drawRect(ctx);
      isMeasureScale = false;
      submitScale(measureValue, length, isMeasureScale, setScale);
      // show dialog
      const dialog = document.getElementById("scale-input-dialog");
      // if dialog has class inactive, remove it
      if (dialog.classList.contains("inactive")) {
        dialog.classList.remove("inactive");
        dialog.classList.add("active");
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
  if (res === "move") {
    if (isMovingFireMode) {
      prevX = currX;
      prevY = currY;
      currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
      currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
      const diffX = currX - prevX;
      const diffY = currY - prevY;
      const movingFire = firePosition.find((fire) => fire.isMoving);
      movingFire.x += diffX;
      movingFire.y += diffY;
      // Clear the canvas
      drawEntities(ctx);
      return;
    }
    if (isMeasureScale) {
      prevX = currX;
      prevY = currY;
      currX = e.pageX - canvas.offsetLeft - canvasContainer.offsetLeft;
      currY = e.pageY - canvas.offsetTop - canvasContainer.offsetTop;
      measureValue = Math.abs(currY - prevY);
      if (measurePath.length === 1) {
        measurePath.push({ x: currX, y: currY });
      } else if (measurePath.length > 1) {
        measurePath[1] = { x: currX, y: currY };
      }
      drawEntities(ctx);
      return;
    }
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
  const files = evt.target.files; // FileList object
  const file = files[0];
  const fileReader = new FileReader();
  // Set file name
  fileName.textContent = file.name;
  console.log(file);
  fileReader.onload = async (e) => {
    console.log(1235);
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
    const pdfTablinks = document.getElementById("pdf-tablinks");
    pdfTablinks.click();
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
    const fileName = document.getElementById("file-name");
    fileName.textContent = "";
    // Clear fire position
    firePosition = [];
    // Clear path position
    pathPosition = [];
    // Clear measure path
    measurePath = [];
    // Clear table data
    const table = document.getElementById("table");
    // Remove all tr except header
    const trs = table.querySelectorAll("tr");
    trs.forEach((tr, index) => {
      if (index !== 0) {
        tr.remove();
      }
    });
    // Clear measure value
    measureValue = 0;
    // Clear scale
    scale = 0;
    isMeasureScale = false;
    isDrawPath = false;
    // Remove pdf canvas
    const pdfCanvas = document.getElementById("pdf-canvas");
    // Clear pdf canvas
    const pdfContext = pdfCanvas.getContext("2d");
    pdfContext.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    // Remove pdf file input
    const fileInput = document.getElementById("file-input");
    fileInput.value = null;
    // Remove canvas event listeners
  });
};

const drawPathBtnHandler = async () => {
  const drawPathBtn = document.getElementById("draw-btn");
  drawPathBtn.addEventListener("click", async () => {
    isDrawPath = !isDrawPath;
    if (isDrawPath) {
      drawPathBtn.classList.add("active");
    } else {
      drawPathBtn.classList.remove("active");
    }
    // Disable all other buttons
    if (!isMeasureScale) {
      return;
    }
    const measureBtn = document.getElementById("measure-scale-btn");
    measureBtn.classList.remove("active");
    isMeasureScale = false;
  });
};

const guideBtnHandler = async () => {
  const guideBtn = document.getElementById("guide-btn");
  guideBtn.addEventListener("click", async () => {
    const webview = new WebviewWindow("guide", {
      url: "/guide.html",
    });
    webview.show();
  });
};

const inputParamsHandler = async () => {
  const inputParamsBtn = document.getElementById("input-params-btn");
  inputParamsBtn.addEventListener("click", async () => {
    const dialog = document.getElementById("params-input-dialog");
    // if dialog has class inactive, remove it
    if (dialog.classList.contains("inactive")) {
      dialog.classList.remove("inactive");
      dialog.classList.add("active");
    } else {
      dialog.classList.remove("active");
      dialog.classList.add("inactive");
    }
  });
};

const inputParamsSubmitBtnHandler = async () => {
  const submitBtn = document.getElementById("params-input-btn");
  submitBtn.addEventListener("click", async () => {
    const dialog = document.getElementById("params-input-dialog");
    // inactivate dialog
    dialog.classList.remove("active");
  });
};

const calculateBtnHandler = async () => {
  const calculateBtn = document.getElementById("calculate-btn");
  calculateBtn.addEventListener("click", async () => {
    console.log(scale, firePosition, pathPosition);
    // Validate all input params
    if (!scale) {
      alert("Please input measure value");
      return;
    }
    if (!firePosition.length) {
      alert("Please add fire");
      return;
    }
    if (!pathPosition.length) {
      alert("Please draw path");
      return;
    }
    const radiativeValue = document.getElementById("radiative-input").value;
    const hobFireValue = document.getElementById("hob-fire-input").value;
    const toleranceValue = document.getElementById(
      "tolerance-limit-input"
    ).value;
    const walkingSpeedValue = document.getElementById(
      "walking-speed-input"
    ).value;
    const shoulderWidthValue = document.getElementById(
      "shoulder-width-input"
    ).value;
    calculate({
      radiativeValue,
      hobFireValue,
      toleranceValue,
      walkingSpeedValue,
      shoulderWidthValue,
      measureValue,
      firePosition,
      pathPosition,
    });
  });
};

const calculate = async (params) => {
  const {
    radiativeValue = 0.44,
    hobFireValue = 472,
    toleranceValue = 85.2,
    walkingSpeedValue = 1,
    shoulderWidthValue = 0.85,
    firePosition,
    pathPosition,
  } = params;
  console.log(firePosition, pathPosition);
  firePosition.forEach((fire, fireIndex) => {
    let fedSum = 0;
    let timeSum = 0;
    let totalFed = 0;
    pathPosition.forEach((point, index) => {
      const table = document.getElementById("table");
      const pathNode = document.querySelectorAll(`[path-index="${index}"]`);
      if (pathNode.length) {
        pathNode.forEach((node) => {
          node.remove();
        });
      }
      // Create td for each path
      if (index === 0) {
        return;
      }
      const tdPoint = document.createElement("td");
      // Set index of point to td
      tdPoint.textContent = index;
      const diffX = point.x - fire.x;
      const diffY = point.y - fire.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY) / scale;
      const tdDistance = document.createElement("td");
      tdDistance.textContent = distance;
      const q =
        (radiativeValue * hobFireValue) / (4 * Math.PI * distance * distance);
      const tdQ = document.createElement("td");
      tdQ.textContent = q;
      const tRad = toleranceValue / q ** 1.33;
      const tdTRad = document.createElement("td");
      tdTRad.textContent = parseFloat(tRad).toFixed(5);
      const timeToNextPoint =
        Math.sqrt(
          (pathPosition[index - 1].x - point.x) ** 2 +
            (pathPosition[index - 1].y - point.y) ** 2
        ) / walkingSpeedValue / scale;
      const tdTimeToNextPoint = document.createElement("td");
      tdTimeToNextPoint.textContent = parseFloat(timeToNextPoint).toFixed(5);
      const fed = timeToNextPoint / tRad;
      const tdFed = document.createElement("td");
      totalFed += fed;
      tdFed.textContent = parseFloat(fed).toFixed(5);
      const avg = fed * timeToNextPoint;
      const tdAvg = document.createElement("td");
      tdAvg.textContent = parseFloat(avg).toFixed(5);
      fedSum += avg;
      const shortestDistance = distance - 0.425;
      const tdShortestDistance = document.createElement("td");
      tdShortestDistance.textContent = parseFloat(shortestDistance).toFixed(5);
      const maximumQ =
        (radiativeValue * hobFireValue) /
        (4 * Math.PI * shortestDistance * shortestDistance);
      const tdMaximumQ = document.createElement("td");
      tdMaximumQ.textContent = parseFloat(maximumQ).toFixed(5);
      timeSum += timeToNextPoint;
      const tdTimeSumOne = document.createElement("td");
      tdTimeSumOne.textContent = parseFloat(timeSum).toFixed(5);
      const tdFedSumOne = document.createElement("td");
      tdFedSumOne.textContent = fedSum;
      const tdTotalFed = document.createElement("td");
      tdTotalFed.textContent = totalFed;
      // Append data to table
      // Append tr to table
      const tr = document.createElement("tr");
      // Add id attribute to tr
      tr.setAttribute("id", `path-${index}`);
      tr.setAttribute("path-index", index);
      tr.appendChild(tdPoint);
      tr.appendChild(tdDistance);
      tr.appendChild(tdQ);
      tr.appendChild(tdTRad);
      tr.appendChild(tdTimeToNextPoint);
      tr.appendChild(tdFed);
      tr.appendChild(tdTotalFed);
      tr.appendChild(tdAvg);
      tr.appendChild(tdShortestDistance);
      tr.appendChild(tdMaximumQ);
      tr.appendChild(tdTimeSumOne);
      table.appendChild(tr);
      // Get last column of first row
      const lastColumn = table.rows[1].cells.length - 1;
      // Add to last column
    });
    const tdFedSum = document.createElement("td");
    tdFedSum.setAttribute("rowspan", pathPosition.length);
    tdFedSum.textContent = fedSum;
    const tdTimeSum = document.createElement("td");
    tdTimeSum.setAttribute("rowspan", pathPosition.length);
    tdTimeSum.textContent = timeSum;
    table.rows[1].appendChild(tdFedSum); // Add to last column
    table.rows[1].appendChild(tdTimeSum); // Add to last column
  });
};

const measureScaleBtnHandler = async () => {
  const measureBtn = document.getElementById("measure-scale-btn");
  measureBtn.addEventListener("click", async () => {
    isMeasureScale = !isMeasureScale;
    measurePath = [];
    if (isMeasureScale) {
      measureBtn.classList.add("active");
    } else {
      measureBtn.classList.remove("active");
    }
    if (!isDrawPath) {
      return;
    }
    const drawPathBtn = document.getElementById("draw-btn");
    drawPathBtn.classList.remove("active");
    isDrawPath = false;
  });
};

const handleExportBtn = async () => {
  const exportBtn = document.getElementById("export-btn");
  exportBtn.addEventListener("click", async () => {
    const table = document.querySelector("table");
    let csv = "";
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td, th");
      const rowData = Array.from(cells).map((cell) => cell.innerText);
      const csvRow = rowData.join(",");
      csv += `${csvRow}\n`;
    });
    const csvData = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const link = document.createElement("a");
    link.setAttribute("href", csvData);
    link.setAttribute("download", "table.csv");
    link.click();
  });
};

const drawEntities = (ctx) => {
  // Clear the canvas
  ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  // Draw fire
  firePosition.forEach((fire) => {
    ctx.drawImage(fireImageObj, fire.x, fire.y);
  });
  // Draw path of measurement
  ctx.strokeStyle = "red";
  measurePath.forEach((point, index) => {
    if (index === 0) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
  if (pathPosition.length > 1) {
    ctx.strokeStyle = "green";
    // Draw path of movement
    pathPosition.forEach((point, index) => {
      if (index === 0) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }
  ctx.stroke();
};

import { WebviewWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";

const { invoke } = window.__TAURI__.tauri;

window.addEventListener("DOMContentLoaded", async () => {
  // Load fire image
  const appVersion = await getVersion();
  const versionEl = document.querySelector("#version");
  versionEl.textContent = appVersion;
});

const pdfInput = document.getElementById("pdf-input");
const pdfCanvas = document.getElementById("pdf-canvas");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const toggleDrawButton = document.getElementById("toggle-draw");
const measureScaleButton = document.getElementById("measure-scale");
const scaleInput = document.getElementById("scale-input");
const scaleSubmitButton = document.getElementById("scale-submit");
const scaleDialog = document.getElementById("scale-dialog");
const toggleFireButton = document.getElementById("toggle-fire");
const paramsInputButton = document.getElementById("toggle-params");
const paramsDialog = document.getElementById("params-dialog");
const paramsSubmitButton = document.getElementById("params-submit");
const radiativeInput = document.getElementById("radiative-input");
const hobFireInput = document.getElementById("hob-fire-input");
const toleranceLimitInput = document.getElementById("tolerance-limit-input");
const walkingSpeedInput = document.getElementById("walking-speed-input");
const shoulderWidthInput = document.getElementById("shoulder-width-input");
const calculateButton = document.getElementById("calculate");
const guideButton = document.getElementById("guide-btn");
const clearAllButton = document.getElementById("clear-all");
const clearPathButton = document.getElementById("clear-path");
const clearFireButton = document.getElementById("clear-fire");
const exportButton = document.getElementById("export");

const ctx = pdfCanvas.getContext("2d");
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

let pdfDoc = null;
let pageNum = 1;
let scale = 1;
let viewport = null;
let renderTask = null;
let pdfX = 0,
  pdfY = 0;
let dragStartX = 0,
  dragStartY = 0;
let isDragging = false;
let drawMode = false;
let lastPoint = null;
let lines = []; // Store lines drawn by the user
let fires = []; // Store fire positions
let pixelsPerMeter = 14.19;
let measureMode = false;
let fireMode = false;
let scaleLine = null;
let myChart;
let fireScale = 0.5;
let isMovingFire = false;

pdfInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file && file.type === "application/pdf") {
    const fileReader = new FileReader();
    fileReader.onload = function () {
      const typedarray = new Uint8Array(this.result);
      pdfjsLib.getDocument(typedarray).promise.then((pdf) => {
        pdfDoc = pdf;
        renderPage(pageNum);
      });
    };
    fileReader.readAsArrayBuffer(file);
    measureScaleButton.disabled = false;
    toggleDrawButton.disabled = false;
    toggleFireButton.disabled = false;
    zoomInButton.disabled = false;
    zoomOutButton.disabled = false;
  }
});

function renderPage(num) {
  pdfDoc.getPage(num).then((page) => {
    viewport = page.getViewport({ scale: scale });
    pixelsPerMeter = viewport.height / (0.83 * 200);
    console.log(viewport.height);
    // Update both offscreen and main canvas sizes
    offscreenCanvas.width = viewport.width;
    offscreenCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;

    const renderContext = {
      canvasContext: offscreenCtx, // Render to the off-screen canvas
      viewport: viewport,
    };

    if (renderTask) {
      renderTask.cancel();
    }
    renderTask = page.render(renderContext);

    renderTask.promise.then(() => {
      redrawLines(); // Redraw lines after the PDF is rendered
    });

    resetPosition();
  });
}

function redrawLines() {
  // Clear the main canvas
  ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

  // Draw the off-screen canvas (which has the rendered PDF)
  ctx.drawImage(offscreenCanvas, 0, 0);

  // Draw all saved lines
  const shoulderWidth = parseFloat(shoulderWidthInput.value);
  const lineWidth = shoulderWidth * pixelsPerMeter;
  ctx.lineWidth = lineWidth * scale;
  // Red color with 50% opacity
  ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";

  lines.forEach((line) => {
    ctx.beginPath();
    ctx.moveTo(line.startX * scale, line.startY * scale);
    ctx.lineTo(line.endX * scale, line.endY * scale);
    ctx.stroke();
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = "blue";

  lines.forEach((line) => {
    ctx.beginPath();
    ctx.moveTo(line.startX * scale, line.startY * scale);
    ctx.lineTo(line.endX * scale, line.endY * scale);
    ctx.stroke();
  });

  ctx.fillStyle = "red";
  fires.forEach((fire) => {
    ctx.beginPath();
    ctx.arc(
      fire.x * scale,
      fire.y * scale,
      fireScale * pixelsPerMeter * scale,
      0,
      2 * Math.PI
    );
    ctx.fill();
  });

  // Draw the scale line if it is in the process of being measured
  if (!(scaleLine && scaleLine.endX !== undefined)) {
    return;
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "green";
  ctx.beginPath();
  ctx.moveTo(scaleLine.startX * scale, scaleLine.startY * scale);
  ctx.lineTo(scaleLine.endX * scale, scaleLine.endY * scale);
  ctx.stroke();
}

function resetPosition() {
  pdfX = 0;
  pdfY = 0;
  pdfCanvas.style.transform = `translate(${pdfX}px, ${pdfY}px)`;
}

zoomInButton.addEventListener("click", () => {
  scale += 0.2;
  renderPage(pageNum);
});

zoomOutButton.addEventListener("click", () => {
  if (scale > 0.2) {
    scale -= 0.2;
    renderPage(pageNum);
  }
});

toggleDrawButton.addEventListener("click", () => {
  drawMode = !drawMode;
  toggleDrawButton.textContent = drawMode
    ? "Disable Draw Mode"
    : "Enable Draw Mode";
});

paramsInputButton.addEventListener("click", () => {
  paramsDialog.showModal();
});

paramsSubmitButton.addEventListener("click", () => {
  redrawLines();
  calculate();
  paramsDialog.close();
});

toggleFireButton.addEventListener("click", () => {
  fireMode = !fireMode;
  drawMode = false; // Disable draw mode if fire mode is active
  measureMode = false; // Disable measure mode if fire mode is active
  toggleFireButton.textContent = fireMode
    ? "Disable Fire Mode"
    : "Add Fire Mode";
  toggleDrawButton.textContent = "Enable Draw Mode";
  measureScaleButton.textContent = "Measure Scale";
});

pdfCanvas.addEventListener("mousedown", (e) => {
  if (!e.ctrlKey && !drawMode && !measureMode) {
    const rect = pdfCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const fireIndex = fires.findIndex((fire) => {
      const distance = Math.sqrt((fire.x - x) ** 2 + (fire.y - y) ** 2);
      return distance <= 0.5 * pixelsPerMeter;
    });
    if (fireIndex !== -1) {
      isMovingFire = true;
      return;
    }
  }
  pdfCanvas.style.cursor = "initial";
  if (drawMode) return; // Don't allow dragging in draw mode

  if (measureMode) {
    if (scaleLine) {
      scaleLine = null;
    } else {
      const rect = pdfCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      scaleLine = { startX: x, startY: y, endX: undefined, endY: undefined };
    }
    redrawLines();
    return;
  }

  // If ctrl key is pressed, start dragging
  if (e.ctrlKey) {
    isDragging = true;
    dragStartX = e.clientX - pdfX;
    dragStartY = e.clientY - pdfY;
    pdfCanvas.style.cursor = "grabbing";
  }
});

pdfCanvas.addEventListener("mousemove", (e) => {
  if (isMovingFire) {
    const rect = pdfCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    fires[0].x = x;
    fires[0].y = y;
    redrawLines();
    return;
  }
  if (measureMode && scaleLine) {
    pdfCanvas.style.cursor = "crosshair";
    const rect = pdfCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Set the end coordinates for the scale line
    scaleLine.endX = x;
    scaleLine.endY = y;

    // Redraw lines including the current measuring line
    redrawLines();
    return;
  }

  if (!isDragging) {
    pdfCanvas.style.cursor = e.ctrlKey ? "grab" : "initial";
    return;
  }
  pdfX = e.clientX - dragStartX;
  pdfY = e.clientY - dragStartY;
  pdfCanvas.style.transform = `translate(${pdfX}px, ${pdfY}px)`;
});

pdfCanvas.addEventListener("mouseup", (e) => {
  if (isMovingFire) {
    isMovingFire = false;
    return;
  }
  if (measureMode && scaleLine) {
    scaleDialog.showModal();
    return;
  }

  if (!isDragging) {
    return;
  }

  if (!e.ctrlKey) {
    return;
  }
  isDragging = false;
  pdfCanvas.style.cursor = "grab";
  checkBounds();
});

pdfCanvas.addEventListener("mouseleave", (e) => {
  if (isMovingFire) {
    isMovingFire = false;
  }
  if (!isDragging) {
    return;
  }
  if (e.ctrlKey) {
    isDragging = false;
    pdfCanvas.style.cursor = "grab";
    checkBounds();
  }
});

pdfCanvas.addEventListener("wheel", (e) => {
  // if mouse position is inside fire circle, update size of fire circle
  const rect = pdfCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;
  const fireIndex = fires.findIndex((fire) => {
    const distance = Math.sqrt((fire.x - x) ** 2 + (fire.y - y) ** 2);
    return distance <= 0.5 * pixelsPerMeter;
  });
  if (fireIndex === -1) {
    return;
  }
  e.preventDefault();
  if (e.deltaY < 0) {
    fireScale += 0.1;
  } else {
    fireScale -= 0.1;
  }
  redrawLines();
  return;
});

pdfCanvas.addEventListener("click", (e) => {
  const rect = pdfCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  if (drawMode) {
    if (lastPoint) {
      const newLine = {
        startX: lastPoint.x,
        startY: lastPoint.y,
        endX: x,
        endY: y,
        length: calculateLineLength(lastPoint.x, lastPoint.y, x, y),
      };
      lines.push(newLine);
      // addLineToList(newLine.length); // Add line length to the list
      redrawLines();
    }
    lastPoint = { x, y };
  } else if (fireMode) {
    const newFire = { x, y };
    fires.push(newFire);
    // addFireToList(newFire); // Calculate and list distances
    redrawLines();
    // disable fire mode after adding a fire
    fireMode = false;
    toggleFireButton.textContent = "Add Fire Mode";
    toggleFireButton.disabled = true;
  }
});

function calculateLineLength(x1, y1, x2, y2) {
  const pixelDistance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const meters = pixelDistance / pixelsPerMeter;
  return meters.toFixed(2); // Return length in meters rounded to two decimal places
}

function checkBounds() {
  const viewerRect = document
    .querySelector(".pdf-viewer")
    .getBoundingClientRect();
  const canvasRect = pdfCanvas.getBoundingClientRect();

  const viewerWidth = viewerRect.width;
  const viewerHeight = viewerRect.height;

  if (canvasRect.left > viewerRect.left) {
    pdfX = 0;
  } else if (canvasRect.right < viewerRect.right) {
    pdfX = viewerWidth - canvasRect.width;
  }

  if (canvasRect.top > viewerRect.top) {
    pdfY = 0;
  } else if (canvasRect.bottom < viewerRect.bottom) {
    pdfY = viewerHeight - canvasRect.height;
  }

  pdfCanvas.style.transform = `translate(${pdfX}px, ${pdfY}px)`;
}

measureScaleButton.addEventListener("click", () => {
  measureMode = !measureMode;
  drawMode = false;
  measureScaleButton.textContent = measureMode
    ? "Disable Measure Scale"
    : "Measure Scale";
  toggleDrawButton.textContent = "Enable Draw Mode";
  pdfCanvas.style.cursor = measureMode ? "crosshair" : "initial";
  scaleLine = null;
  redrawLines();
});

scaleSubmitButton.addEventListener("click", () => {
  const realWorldLength = parseFloat(scaleInput.value);
  if (!isNaN(realWorldLength) && scaleLine) {
    const pixelDistance = Math.sqrt(
      (scaleLine.endX - scaleLine.startX) ** 2 +
        (scaleLine.endY - scaleLine.startY) ** 2
    );
    pixelsPerMeter = pixelDistance / realWorldLength;
  } else {
    alert("Please enter a valid scale length");
    return;
  }
  scaleDialog.close();
  offMeasurementMode();
  if (fires.length > 0 && lines.length > 0) {
    redrawLines();
    calculate();
  }
});

guideButton.addEventListener("click", async () => {
  const webview = new WebviewWindow("guide", {
    url: "guide.html",
  });
  webview.show();
});

const calculate = () => {
  if (fires.length === 0 || lines.length === 0) {
    alert("Please draw at least one path and one fire");
    return;
  }
  if (
    radiativeInput.value === "" ||
    hobFireInput.value === "" ||
    toleranceLimitInput.value === "" ||
    walkingSpeedInput.value === ""
  ) {
    alert("Please fill in all the parameters");
    return;
  }
  // Reset the table
  const table = document.getElementById("table");
  // Remove all rows except the first one
  for (let i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
  const radiative = parseFloat(radiativeInput.value);
  const hobFire = parseFloat(hobFireInput.value);
  const toleranceLimit = parseFloat(toleranceLimitInput.value);
  const walkingSpeed = parseFloat(walkingSpeedInput.value);

  if (
    isNaN(radiative) ||
    isNaN(hobFire) ||
    isNaN(toleranceLimit) ||
    isNaN(walkingSpeed)
  ) {
    alert("Please fill in all the parameters");
    return;
  }
  const feds = [0];
  let totalFed = 0;
  let fedSum = 0;
  let timeSum = 0;
  let timeArray = [0];

  lines.forEach((line, index) => {
    const distances = calculateLineLength(
      fires[0].x,
      fires[0].y,
      line.endX,
      line.endY
    );
    const q = (radiative * hobFire) / (4 * Math.PI * distances ** 2);
    const tRad = toleranceLimit / q ** 1.33;
    const timeToNextLine =
      calculateLineLength(line.startX, line.startY, line.endX, line.endY) /
      walkingSpeed;
    const fed = timeToNextLine / tRad;
    totalFed += fed;
    feds.push(totalFed);
    const avg = fed * timeToNextLine;
    fedSum += avg;
    const shortestDistance = distances - shoulderWidthInput.value / 2;
    const maximumQ =
      (radiative * hobFire) / (4 * Math.PI * shortestDistance ** 2);
    timeSum += timeToNextLine;
    timeArray.push(timeSum.toFixed(2));
    // append to the table
    const table = document.getElementById("table");
    const row = table.insertRow(-1);
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);
    const cell4 = row.insertCell(3);
    const cell5 = row.insertCell(4);
    const cell6 = row.insertCell(5);
    const cell7 = row.insertCell(6);
    const cell8 = row.insertCell(7);
    const cell9 = row.insertCell(8);
    const cell10 = row.insertCell(9);
    const cell11 = row.insertCell(10);
    cell1.textContent = index;
    cell2.textContent = distances;
    cell3.textContent = q.toFixed(2);
    cell4.textContent = tRad.toFixed(2);
    cell5.textContent = timeToNextLine.toFixed(2);
    cell6.textContent = fed.toFixed(2);
    cell7.textContent = totalFed.toFixed(2);
    cell8.textContent = avg.toFixed(2);
    cell9.textContent = shortestDistance.toFixed(2);
    cell10.textContent = maximumQ.toFixed(2);
    cell11.textContent = timeSum.toFixed(2);
  });
  const tdFedSum = document.createElement("td");
  tdFedSum.setAttribute("rowspan", lines.length);
  tdFedSum.textContent = fedSum.toFixed(2);
  const tdTimeSum = document.createElement("td");
  tdTimeSum.setAttribute("rowspan", lines.length);
  tdTimeSum.textContent = timeSum.toFixed(2);
  table.rows[1].appendChild(tdFedSum);
  table.rows[1].appendChild(tdFedSum);
  // Remove the chart if it exists
  if (myChart) {
    myChart.destroy();
  }
  const graphData = lines.map((line) => {
    const distances = calculateLineLength(
      fires[0].x,
      fires[0].y,
      line.endX,
      line.endY
    );
    const q = (radiative * hobFire) / (4 * Math.PI * distances ** 2);
    const tRad = toleranceLimit / q ** 1.33;
    const timeToNextLine =
      calculateLineLength(
        line.startX,
        line.startY,
        line.endX,
        line.endY
      ) / walkingSpeed;
    const fed = timeToNextLine / tRad;
    return fed.toFixed(2);
  });
  graphData.unshift(0);
  // Draw line graph with y-axis as FED and x-axis as time
  myChart = new Chart("myChart", {
    type: "line",
    data: {
      labels: timeArray,
      datasets: [
        {
          label: "FED",
          data: feds,
          fill: false,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
        x: {
          beginAtZero: true,
          title: {
            text: "Time",
            display: true,
          },
        },
      },
    },
  });
};

calculateButton.addEventListener("click", calculate);

function offMeasurementMode() {
  measureMode = false;
  measureScaleButton.textContent = "Measure Scale";
}

document.getElementById("masterButton").addEventListener("click", function () {
  const actionButtons = document.getElementById("actionButtons");
  actionButtons.style.display =
    actionButtons.style.display === "none" || actionButtons.style.display === ""
      ? "block"
      : "none";
});

clearAllButton.addEventListener("click", () => {
  lines = [];
  fires = [];
  redrawLines();
  toggleFireButton.disabled = true;
  measureScaleButton.disabled = true;
  toggleDrawButton.disabled = true;
  zoomInButton.disabled = true;
  zoomOutButton.disabled = true;
  // Remove the table
  const table = document.getElementById("table");
  // Remove all rows except the first one
  for (let i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
  // Remove file input
  pdfInput.value = "";
  pdfDoc = null;
  pdfCanvas.width = 0;
  pdfCanvas.height = 0;
  offscreenCanvas.width = 0;
  offscreenCanvas.height = 0;
});

clearPathButton.addEventListener("click", () => {
  lines = [];
  lastPoint = null;
  redrawLines();
  // Remove the table
  const table = document.getElementById("table");
  // Remove all rows except the first one
  for (let i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
});

clearFireButton.addEventListener("click", () => {
  fires = [];
  toggleFireButton.disabled = false;
  fireScale = 0.5;
  // Remove the table
  const table = document.getElementById("table");
  // Remove all rows except the first one
  for (let i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
  redrawLines();
});

exportButton.addEventListener("click", () => {
  const table = document.querySelector("table");
  let csv = "";
  const rows = table.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td, th");
    const rowData = Array.from(cells).map((cell) => cell.innerText);
    const csvRow = rowData.join(",");
    csv += `${csvRow}\n`;
  });
  const csvData = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  const link = document.createElement("a");
  link.setAttribute("href", csvData);
  link.setAttribute("download", "table.csv");
  link.click();
});

import fireImage from "./assets/fire-48.png";

export const addFireBtn = (drawringCanvas, firePosition, fireImageObj) => {
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

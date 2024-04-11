export const tableToCsv = () => {
  const table = document.querySelector("table"); // Assuming you have an HTML table element

  let csv = "";
  const rows = table.querySelectorAll("tr");

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td, th");
    const rowData = Array.from(cells).map((cell) => cell.innerText);
    const csvRow = rowData.join(",");
    csv += csvRow + "\n";
  });

  const csvData = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const link = document.createElement("a");
  link.setAttribute("href", csvData);
  link.setAttribute("download", "table.csv");
  link.click();
};

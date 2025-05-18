function runPageReplacement() {
  const algo = document.getElementById("algorithm").value;
  const pages = document.getElementById("pages").value.split(",").map(Number);
  const frameCount = parseInt(document.getElementById("frames").value);

  let result;

  if (algo === "FIFO") result = fifo(pages, frameCount);
  else if (algo === "LRU") result = lru(pages, frameCount);
  else if (algo === "Optimal") result = optimal(pages, frameCount);

  renderTable(pages, result.history, result.status, result.pageFaults);
}

function fifo(pages, frameCount) {
  const history = [];
  const status = [];
  const queue = [];
  const memory = new Set();
  let faults = 0;

  for (let page of pages) {
    if (!memory.has(page)) {
      if (memory.size === frameCount) {
        memory.delete(queue.shift());
      }
      memory.add(page);
      queue.push(page);
      faults++;
      status.push("Fault");
    } else {
      status.push("Hit");
    }
    history.push(Array.from(memory));
  }

  return { history, status, pageFaults: faults };
}

function lru(pages, frameCount) {
  const history = [];
  const status = [];
  const memory = [];
  let faults = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!memory.includes(page)) {
      if (memory.length === frameCount) {
        let lruPage = -1,
          minIndex = Infinity;
        for (let m of memory) {
          let lastUsed = pages.slice(0, i).lastIndexOf(m);
          if (lastUsed < minIndex) {
            minIndex = lastUsed;
            lruPage = m;
          }
        }
        memory.splice(memory.indexOf(lruPage), 1);
      }
      memory.push(page);
      faults++;
      status.push("Fault");
    } else {
      memory.splice(memory.indexOf(page), 1);
      memory.push(page);
      status.push("Hit");
    }
    history.push([...memory]);
  }

  return { history, status, pageFaults: faults };
}

function optimal(pages, frameCount) {
  const history = [];
  const status = [];
  const memory = [];
  let faults = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!memory.includes(page)) {
      if (memory.length === frameCount) {
        const futureIndexes = memory.map((m) => {
          const nextUse = pages.slice(i + 1).indexOf(m);
          return nextUse === -1 ? Infinity : nextUse;
        });
        const indexToReplace = futureIndexes.indexOf(
          Math.max(...futureIndexes)
        );
        memory.splice(indexToReplace, 1);
      }
      memory.push(page);
      faults++;
      status.push("Fault");
    } else {
      status.push("Hit");
    }
    history.push([...memory]);
  }

  return { history, status, pageFaults: faults };
}

function renderTable(pages, history, status, pageFaults) {
  const tableDiv = document.getElementById("tableOutput");
  tableDiv.innerHTML = "";

  const table = document.createElement("table");
  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th")); // top-left empty

  pages.forEach((page, i) => {
    const th = document.createElement("th");
    th.textContent = `P${i + 1} (${page})`;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  const maxFrames = Math.max(...history.map((h) => h.length));
  for (let i = 0; i < maxFrames; i++) {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = `Frame ${i + 1}`;
    row.appendChild(th);

    for (let step = 0; step < pages.length; step++) {
      const td = document.createElement("td");
      const frameContent = history[step][i];
      td.textContent = frameContent !== undefined ? frameContent : "";
      row.appendChild(td);
    }

    table.appendChild(row);
  }

  const statusRow = document.createElement("tr");
  const th = document.createElement("th");
  th.textContent = "Status";
  statusRow.appendChild(th);

  status.forEach((s) => {
    const td = document.createElement("td");
    td.textContent = s;
    td.className = s === "Hit" ? "hit" : "fault";
    statusRow.appendChild(td);
  });

  table.appendChild(statusRow);
  tableDiv.appendChild(table);

  document.getElementById(
    "faultCount"
  ).innerText = `Total Page Faults: ${pageFaults}`;
}

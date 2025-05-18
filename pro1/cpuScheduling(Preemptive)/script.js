function toggleQuantum() {
  const algorithm = document.getElementById("algorithm").value;
  document.getElementById("quantumField").style.display =
    algorithm === "RR" ? "inline" : "none";

  const showPriority = algorithm === "Priority";
  document.querySelectorAll(".priority-col").forEach((col) => {
    col.style.display = showPriority ? "table-cell" : "none";
  });
}
let processCounter = 2;
function addProcessRow() {
  const selectedAlgorithm = document.getElementById("algorithm").value;
  const showPriorityColumn = selectedAlgorithm === "Priority";

  const processTable = document.getElementById("tableBody");
  const newRow = processTable.insertRow();

  newRow.innerHTML = `
    <td><input type="text" value="P${processCounter++}"></td>
    <td><input type="number" value="0"></td>
    <td><input type="number" value="1"></td>
    <td class="priority-col" style="display: ${
      showPriorityColumn ? "table-cell" : "none"
    };">
      <input type="number" value="1" placeholder="Priority"/>
    </td>
  `;
}

function executeScheduler() {
  const selectedAlgorithm = document.getElementById("algorithm").value;
  const processTable = document.getElementById("tableBody");
  const processList = [];

  for (let row of processTable.rows) {
    const processId = row.cells[0].children[0].value;
    const arrivalTime = parseInt(row.cells[1].children[0].value);
    const burstTime = parseInt(row.cells[2].children[0].value);
    const priorityVal = row.cells[3]?.children[0]
      ? parseInt(row.cells[3].children[0].value)
      : 0;
    processList.push({ pid: processId, at: arrivalTime, bt: burstTime, priority: priorityVal });
  }

  let result;
  if (selectedAlgorithm === "SRTF") result = scheduleSRTF(processList);
  else if (selectedAlgorithm === "LRTF") result = scheduleLRTF(processList);
  else if (selectedAlgorithm === "RR") {
    const quantumVal = parseInt(document.getElementById("quantum").value);
    result = scheduleRR(processList, quantumVal);
  } else if (selectedAlgorithm === "Priority")
    result = schedulePriorityPreemptive(processList);

  renderGanttChart(result.GanttsChart);
  renderResultTable(result.outputTable);
}

function scheduleSRTF(processes) {
  const readyQueue = processes.map((p) => ({ ...p, rt: p.bt }));
  let currentTime = 0,
    finished = 0;
  const total = readyQueue.length;
  const ganttData = [];
  const resultData = [];
  let currentProc = null;

  while (finished < total) {
    const available = readyQueue.filter((p) => p.at <= currentTime && p.rt > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }

    currentProc = available.reduce((a, b) => (a.rt < b.rt ? a : b));

    if (!ganttData.length || ganttData[ganttData.length - 1].pid !== currentProc.pid) {
      ganttData.push({ pid: currentProc.pid, start: currentTime });
    }

    currentProc.rt--;
    currentTime++;

    if (currentProc.rt === 0) {
      currentProc.completion = currentTime;
      currentProc.tat = currentProc.completion - currentProc.at;
      currentProc.wt = currentProc.tat - currentProc.bt;
      resultData.push(currentProc);
      finished++;
    }

    const last = ganttData[ganttData.length - 1];
    last.end = currentTime;
  }

  return { GanttsChart: ganttData, outputTable: resultData };
}

function scheduleLRTF(processes) {
  const readyQueue = processes.map((p) => ({ ...p, rt: p.bt }));
  let currentTime = 0,
    finished = 0;
  const total = readyQueue.length;
  const ganttData = [];
  const resultData = [];

  while (finished < total) {
    const available = readyQueue.filter((p) => p.at <= currentTime && p.rt > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }

    const currentProc = available.reduce((a, b) => (a.rt > b.rt ? a : b));

    if (!ganttData.length || ganttData[ganttData.length - 1].pid !== currentProc.pid) {
      ganttData.push({ pid: currentProc.pid, start: currentTime });
    }

    currentProc.rt--;
    currentTime++;

    if (currentProc.rt === 0) {
      currentProc.completion = currentTime;
      currentProc.tat = currentProc.completion - currentProc.at;
      currentProc.wt = currentProc.tat - currentProc.bt;
      resultData.push(currentProc);
      finished++;
    }

    const last = ganttData[ganttData.length - 1];
    last.end = currentTime;
  }

  return { GanttsChart: ganttData, outputTable: resultData };
}

function scheduleRR(processes, timeQuantum) {
  const queue = [];
  const readyQueue = processes.map((p) => ({ ...p, rt: p.bt }));
  const ganttData = [];
  const resultData = [];
  let currentTime = 0;

  const getArrivals = () =>
    readyQueue.filter((p) => p.at <= currentTime && p.rt > 0 && !queue.includes(p));
  const completedSet = new Set();

  while (true) {
    const newEntries = getArrivals();
    queue.push(...newEntries);

    if (queue.length === 0) {
      if (readyQueue.every((p) => p.rt === 0)) break;
      currentTime++;
      continue;
    }

    const currentProc = queue.shift();
    const runTime = Math.min(timeQuantum, currentProc.rt);
    const start = currentTime;
    currentTime += runTime;
    currentProc.rt -= runTime;

    ganttData.push({ pid: currentProc.pid, start, end: currentTime });

    const freshArrivals = getArrivals();
    queue.push(...freshArrivals);

    if (currentProc.rt > 0) {
      queue.push(currentProc);
    } else if (!completedSet.has(currentProc.pid)) {
      currentProc.completion = currentTime;
      currentProc.tat = currentTime - currentProc.at;
      currentProc.wt = currentProc.tat - currentProc.bt;
      resultData.push(currentProc);
      completedSet.add(currentProc.pid);
    }
  }

  return { GanttsChart: ganttData, outputTable: resultData };
}

function schedulePriorityPreemptive(processes) {
  const readyQueue = processes.map((p) => ({ ...p, rt: p.bt }));
  let currentTime = 0,
    finished = 0;
  const total = readyQueue.length;
  const ganttData = [];
  const resultData = [];

  while (finished < total) {
    const available = readyQueue.filter((p) => p.at <= currentTime && p.rt > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }

    const currentProc = available.reduce((a, b) =>
      a.priority < b.priority ? a : b
    );

    if (!ganttData.length || ganttData[ganttData.length - 1].pid !== currentProc.pid) {
      ganttData.push({ pid: currentProc.pid, start: currentTime });
    }

    currentProc.rt--;
    currentTime++;

    if (currentProc.rt === 0) {
      currentProc.completion = currentTime;
      currentProc.tat = currentProc.completion - currentProc.at;
      currentProc.wt = currentProc.tat - currentProc.bt;
      resultData.push(currentProc);
      finished++;
    }

    const last = ganttData[ganttData.length - 1];
    last.end = currentTime;
  }

  return { GanttsChart: ganttData, outputTable: resultData };
}

function renderGanttChart(blocks) {
  const ganttContainer = document.getElementById("ganttChart");
  ganttContainer.innerHTML = "";
  blocks.forEach((block) => {
    const blockDiv = document.createElement("div");
    blockDiv.className = "gantt-block";
    blockDiv.textContent = `${block.pid} (${block.start}→${block.end})`;
    ganttContainer.appendChild(blockDiv);
  });
}

function renderResultTable(results) {
  const outputTable = document.getElementById("outputTable");
  outputTable.innerHTML = `
    <tr>
      <th>PID</th>
      <th>Arrival</th>
      <th>Burst</th>
      <th>Start</th>
      <th>Completion</th>
      <th>Turnaround</th>
      <th>Waiting</th>
    </tr>
  `;

  for (let p of results) {
    const row = outputTable.insertRow();
    row.innerHTML = `
      <td>${p.pid}</td>
      <td>${p.at}</td>
      <td>${p.bt}</td>
      <td>${p.start || p.at}</td>
      <td>${p.completion}</td>
      <td>${p.tat}</td>
      <td>${p.wt}</td>
    `;
  }
}

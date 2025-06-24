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
  const processTable = document.getElementById("tableBody");
  const selectedAlgorithm = document.getElementById("algorithm").value;
  const showPriorityColumn = selectedAlgorithm === "Priority";

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
    <td>
      <button onclick="deleteProcessRow(this)">Delete</button>
    </td>
  `;
}

function deleteProcessRow(button) {
  const row = button.parentElement.parentElement;
  row.parentElement.removeChild(row);
}

function calculateMetrics(processes) {
  const totalProcesses = processes.length;
  if (totalProcesses === 0) return { avgTat: 0, avgWt: 0, efficiency: 0 };

  const totalTat = processes.reduce((sum, p) => sum + p.tat, 0);
  const totalWt = processes.reduce((sum, p) => sum + p.wt, 0);
  const totalBt = processes.reduce((sum, p) => sum + p.bt, 0);

  const avgTat = totalTat / totalProcesses;
  const avgWt = totalWt / totalProcesses;
  const efficiency = totalBt > 0 ? 1 - avgWt / totalBt : 0;

  return { avgTat: avgTat.toFixed(2), avgWt: avgWt.toFixed(2), efficiency: (efficiency * 100).toFixed(2) };
}

function renderSummaryTable(results) {
  const summaryTable = document.getElementById("summaryTable");
  summaryTable.innerHTML = `
    <tr>
      <th>Algorithm</th>
      <th>Avg Turnaround Time</th>
      <th>Avg Waiting Time</th>
      <th>Efficiency (%)</th>
    </tr>
  `;

  for (const [algo, metrics] of Object.entries(results)) {
    const row = summaryTable.insertRow();
    row.innerHTML = `
      <td>${algo}</td>
      <td>${metrics.avgTat}</td>
      <td>${metrics.avgWt}</td>
      <td>${metrics.efficiency}</td>
    `;
  }
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
    if (isNaN(arrivalTime) || isNaN(burstTime) || burstTime <= 0 || (row.cells[3]?.children[0] && isNaN(priorityVal))) {
      alert("Please enter valid numbers for Arrival Time, Burst Time, and Priority (if applicable). Burst Time must be positive.");
      return;
    }
    processList.push({ pid: processId, at: arrivalTime, bt: burstTime, priority: priorityVal });
  }

  if (processList.length === 0) {
    alert("Please add at least one process.");
    return;
  }

  const quantumVal = parseInt(document.getElementById("quantum").value) || 2;
  const allResults = {
    SRTF: scheduleSRTF(processList),
    LRTF: scheduleLRTF(processList),
    RR: scheduleRR(processList, quantumVal),
    Priority: schedulePriorityPreemptive(processList)
  };

  const summaryMetrics = {};
  for (const [algo, result] of Object.entries(allResults)) {
    summaryMetrics[algo] = calculateMetrics(result.outputTable);
  }

  renderSummaryTable(summaryMetrics);
  renderGanttChart(allResults[selectedAlgorithm].GanttsChart);
  renderResultTable(allResults[selectedAlgorithm].outputTable);
}

function scheduleSRTF(processes) {
  const ProcessWrt = processes.map((p) => ({ ...p, rt: p.bt }));
  let currentTime = 0,
    finished = 0;
  const total = ProcessWrt.length;
  const ganttData = [];
  const resultData = [];
  let currentProc = null;

  while (finished < total) {
    const available = ProcessWrt.filter((p) => p.at <= currentTime && p.rt > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }

    currentProc = available.reduce((a, b) => {
      if (a.rt === b.rt) {
        return a.pid < b.pid ? a : b; // Lower PID wins if remaining times are equal
      }
      return a.rt < b.rt ? a : b; // Lower remaining time wins
    });

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
  const ProcessWrt = processes.map((p) => ({ ...p, rt: p.bt }));
  let currentTime = 0,
    finished = 0;
  const total = ProcessWrt.length;
  const ganttData = [];
  const resultData = [];

  while (finished < total) {
    const available = ProcessWrt.filter((p) => p.at <= currentTime && p.rt > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }

    const currentProc = available.reduce((a, b) => {
      if (a.rt === b.rt) {
        return a.pid < b.pid ? a : b; // Lower PID wins if remaining times are equal
      }
      return a.rt > b.rt ? a : b; // Higher remaining time wins
    });

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
  const ProcessWrt = processes.map((p) => ({ ...p, rt: p.bt }));
  const ganttData = [];
  const resultData = [];
  let currentTime = 0;

  const getArrivals = () =>
    ProcessWrt.filter((p) => p.at <= currentTime && p.rt > 0 && !queue.includes(p));
  const completedSet = new Set();

  while (true) {
    const newEntries = getArrivals();
    queue.push(...newEntries);

    if (queue.length === 0) {
      if (ProcessWrt.every((p) => p.rt === 0)) break;
      currentTime++;
      continue;
    }

    const currentProc = queue.shift();
    const runTime = Math.min(timeQuantum, currentProc.rt);
    const start = currentTime;
    currentTime += runTime;
    currentProc.rt -= runTime;

    ganttData.push({ pid: currentProc.pid, start, end: currentTime });

    const newArrivals = getArrivals();
    queue.push(...newArrivals);

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
  const ProcessWrt = processes.map((p) => ({ ...p, rt: p.bt }));
  let currentTime = 0,
    finished = 0;
  const total = ProcessWrt.length;
  const ganttData = [];
  const resultData = [];

  while (finished < total) {
    const available = ProcessWrt.filter((p) => p.at <= currentTime && p.rt > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }

    const currentProc = available.reduce((a, b) => {
      if (a.priority === b.priority) {
        return a.pid < b.pid ? a : b; // Lower PID wins if priorities are equal
      }
      return a.priority < b.priority ? a : b; // Lower priority value wins
    });

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
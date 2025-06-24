function togglePriority() {
  const algorithm = document.getElementById("algorithm").value;
  const showPriority = algorithm === "Priority";
  document.querySelectorAll(".priority-col").forEach((col) => {
    col.style.display = showPriority ? "table-cell" : "none";
  });
}

let processCounter = 2;

function addProcessRow() {
  const algorithm = document.getElementById("algorithm").value;
  const showPriority = algorithm === "Priority";
  const table = document.getElementById("tableBody");
  const row = table.insertRow();

  row.innerHTML = `
    <td><input type="text" value="P${processCounter++}"></td>
    <td><input type="number" min="0" value="0"></td>
    <td><input type="number" min="1" value="1"></td>
    <td class="priority-col" style="display: ${showPriority ? "table-cell" : "none"};">
      <input type="number" min="0" value="1" placeholder="Priority"/>
    </td>
    <td><button onclick="deleteProcessRow(this)">Delete</button></td>
  `;
}

function deleteProcessRow(button) {
  const row = button.parentNode.parentNode;
  row.parentNode.removeChild(row);
}

function calculateMetrics(processes) {
  const totalProcesses = processes.length;
  if (totalProcesses === 0) return { avgTat: 0, avgWt: 0, efficiency: 0 };

  const totalTat = processes.reduce((sum, p) => sum + p.tat, 0);
  const totalWt = processes.reduce((sum, p) => sum + p.wt, 0);
  const totalBt = processes.reduce((sum, p) => sum + p.bt, 0);

  const avgTat = totalTat / totalProcesses;
  const avgWt = totalWt / totalProcesses;
  const efficiency = totalBt > 0 ? (1 - avgWt / totalBt) * 100 : 0;

  return { avgTat: avgTat.toFixed(2), avgWt: avgWt.toFixed(2), efficiency: efficiency.toFixed(2) };
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
  const table = document.getElementById("tableBody");
  const processes = [];

  // Input validation
  for (let row of table.rows) {
    const pid = row.cells[0].children[0].value.trim();
    const at = parseInt(row.cells[1].children[0].value);
    const bt = parseInt(row.cells[2].children[0].value);
    const priority = row.cells[3]?.children[0] ? parseInt(row.cells[3].children[0].value) : 0;

    if (!pid) {
      alert("Process ID cannot be empty.");
      return;
    }
    if (isNaN(at) || at < 0) {
      alert("Arrival Time must be a non-negative number.");
      return;
    }
    if (isNaN(bt) || bt <= 0) {
      alert("Burst Time must be a positive number.");
      return;
    }
    if (selectedAlgorithm === "Priority" && (isNaN(priority) || priority < 0)) {
      alert("Priority must be a non-negative number for Priority Scheduling.");
      return;
    }
    processes.push({ pid, at, bt, priority });
  }

  if (processes.length === 0) {
    alert("Please add at least one process.");
    return;
  }

  // Run all algorithms
  const allResults = {
    FCFS: runFCFS(processes),
    SJFS: runSJFS(processes),
    LJFS: runLJFS(processes),
    Priority: runPriority(processes)
  };

  // Calculate metrics for all algorithms
  const summaryMetrics = {};
  for (const [algo, result] of Object.entries(allResults)) {
    summaryMetrics[algo] = calculateMetrics(result.finalTable);
  }

  // Render summary table
  renderSummaryTable(summaryMetrics);

  // Render Gantt chart and process table for selected algorithm
  const selectedResult = allResults[selectedAlgorithm];
  renderGanttChart(selectedResult.Gantts);
  renderResultTable(selectedResult.finalTable);
}

function runFCFS(procList) {
  const procs = [...procList].sort((a, b) => a.at - b.at);
  let time = 0;
  let Gantts = [], finalTable = [];

  for (let p of procs) {
    const start = Math.max(time, p.at);
    const completion = start + p.bt;
    const tat = completion - p.at;
    const wt = tat - p.bt;
    Gantts.push({ pid: p.pid, start, end: completion });
    finalTable.push({ ...p, start, completion, tat, wt });
    time = completion;
  }

  return { Gantts, finalTable };
}

function runSJFS(procList) {
  const procs = [...procList].map(p => ({ ...p }));
  const n = procs.length;
  let time = 0, completed = 0;
  let Gantts = [], finalTable = [];
  const maxTime = 100000; // Prevent infinite loops

  while (completed < n && time < maxTime) {
    const available = procs.filter((p) => p.at <= time && !p.done);
    if (available.length === 0) {
      time++;
      continue;
    }

    const current = available.reduce((a, b) => {
      if (a.bt === b.bt) {
        return a.pid < b.pid ? a : b; // Lower PID wins if burst times are equal
      }
      return a.bt < b.bt ? a : b; // Lower burst time wins
    });

    const start = time;
    const completion = time + current.bt;
    const tat = completion - current.at;
    const wt = tat - current.bt;

    Gantts.push({ pid: current.pid, start, end: completion });
    finalTable.push({ ...current, start, completion, tat, wt });
    current.done = true;
    completed++;
    time = completion;
  }

  if (time >= maxTime) {
    throw new Error("SJFS computation exceeded maximum time limit.");
  }

  return { Gantts, finalTable };
}

function runLJFS(procList) {
  const procs = [...procList].map(p => ({ ...p }));
  const n = procs.length;
  let time = 0, completed = 0;
  let Gantts = [], finalTable = [];
  const maxTime = 100000;

  while (completed < n && time < maxTime) {
    const available = procs.filter((p) => p.at <= time && !p.done);
    if (available.length === 0) {
      time++;
      continue;
    }

    const current = available.reduce((a, b) => {
      if (a.bt === b.bt) {
        return a.pid < b.pid ? a : b; // Lower PID wins if burst times are equal
      }
      return a.bt > b.bt ? a : b; // Higher burst time wins
    });

    const start = time;
    const completion = time + current.bt;
    const tat = completion - current.at;
    const wt = tat - current.bt;

    Gantts.push({ pid: current.pid, start, end: completion });
    finalTable.push({ ...current, start, completion, tat, wt });
    current.done = true;
    time = completion;
    completed++;
  }

  if (time >= maxTime) {
    throw new Error("LJFS computation exceeded maximum time limit.");
  }

  return { Gantts, finalTable };
}

function runPriority(procList) {
  const procs = [...procList].map(p => ({ ...p }));
  const n = procs.length;
  let time = 0, completed = 0;
  let Gantts = [], finalTable = [];
  const maxTime = 100000;

  while (completed < n && time < maxTime) {
    const available = procs.filter((p) => p.at <= time && !p.done);
    if (available.length === 0) {
      time++;
      continue;
    }

    const current = available.reduce((a, b) => {
      if (a.priority === b.priority) {
        return a.pid < b.pid ? a : b; // Lower PID wins if priorities are equal
      }
      return a.priority < b.priority ? a : b; // Lower priority value wins
    });

    const start = time;
    const completion = time + current.bt;
    const tat = completion - current.at;
    const wt = tat - current.bt;

    Gantts.push({ pid: current.pid, start, end: completion });
    finalTable.push({ ...current, start, completion, tat, wt });
    current.done = true;
    time = completion;
    completed++;
  }

  if (time >= maxTime) {
    throw new Error("Priority computation exceeded maximum time limit.");
  }

  return { Gantts, finalTable };
}

function renderGanttChart(blocks) {
  const chart = document.getElementById("ganttChart");
  chart.innerHTML = "";
  blocks.forEach((block) => {
    const div = document.createElement("div");
    div.className = "gantt-block";
    div.textContent = `${block.pid} (${block.start}→${block.end})`;
    chart.appendChild(div);
  });
}

function renderResultTable(procs) {
  const table = document.getElementById("outputTable");
  table.innerHTML = `
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

  for (let p of procs) {
    const row = table.insertRow();
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
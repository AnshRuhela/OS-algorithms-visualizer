function togglePriority() {
  const algorithm = document.getElementById("algorithm").value;
  const showPriority = algorithm === "Priority";
  document.querySelectorAll(".priority-col").forEach((col) => {
    col.style.display = showPriority ? "table-cell" : "none";
  });
}

let count = 2;
function addRow() {
  const algorithm = document.getElementById("algorithm").value;
  const showPriority = algorithm === "Priority";

  const table = document.getElementById("tableBody");
  const row = table.insertRow();

  row.innerHTML = `
    <td><input type="text" value="P${count++}"></td>
    <td><input type="number" value="0"></td>
    <td><input type="number" value="1"></td>
    <td class="priority-col" style="display: ${
      showPriority ? "table-cell" : "none"
    };">
      <input type="number" value="1" placeholder="Priority"/>
    </td>
  `;
}

function runScheduler() {
  const algorithm = document.getElementById("algorithm").value;
  const table = document.getElementById("tableBody");
  const processes = [];

  for (let row of table.rows) {
    const pid = row.cells[0].children[0].value;
    const at = parseInt(row.cells[1].children[0].value);
    const bt = parseInt(row.cells[2].children[0].value);
    const priority = row.cells[3]?.children[0]
      ? parseInt(row.cells[3].children[0].value)
      : 0;
    processes.push({ pid, at, bt, priority });
  }

  if (algorithm === "FCFS") result = runFCFS(processes);
  else if (algorithm === "SJFS") result = runSJFS(processes);
  else if (algorithm === "LJFS") result = runLJFS(processes);
  else if (algorithm === "Priority") result = runPriority(processes);

  displayGanttChart(result.Gantts);
  displayTable(result.finalTable);
}

function runSJFS(procList) {
  const procs = [...procList];
  const n = procs.length;
  let time = 0,
    completed = 0;
  let Gantts = [],
    finalTable = [];

  while (completed < n) {
    const available = procs.filter((p) => p.at <= time && !p.done);
    if (available.length === 0) {
      time++;
      continue;
    }

    const current = available.reduce((a, b) => (a.bt < b.bt ? a : b));
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

  return { Gantts, finalTable };
}

function runLJFS(procList) {
  const procs = [...procList];
  const n = procs.length;
  let time = 0,
    completed = 0;
  let Gantts = [],
    finalTable = [];

  while (completed < n) {
    const available = procs.filter((p) => p.at <= time && !p.done);
    if (available.length === 0) {
      time++;
      continue;
    }

    const current = available.reduce((a, b) => (a.bt > b.bt ? a : b));
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

  return { Gantts, finalTable };
}

function runPriority(procList) {
  const procs = [...procList];
  const n = procs.length;
  let time = 0,
    completed = 0;
  let Gantts = [],
    finalTable = [];

  while (completed < n) {
    const available = procs.filter((p) => p.at <= time && !p.done);
    if (available.length === 0) {
      time++;
      continue;
    }

    const current = available.reduce((a, b) =>
      a.priority < b.priority ? a : b
    );
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

  return { Gantts, finalTable };
}
function runFCFS(procList) {
  const procs = [...procList].sort((a, b) => a.at - b.at);
  let time = 0;
  let Gantts = [], 
    finalTable = []; 

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

function displayGanttChart(blocks) {
  const chart = document.getElementById("ganttChart");
  chart.innerHTML = "";
  blocks.forEach((block) => {
    const div = document.createElement("div");
    div.className = "gantt-block";
    div.textContent = `${block.pid} (${block.start}→${block.end})`;
    chart.appendChild(div);
  });
}

function displayTable(procs) {
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

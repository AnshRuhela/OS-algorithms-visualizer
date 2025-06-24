let chartInstance = null;

function runDiskScheduling() {
  const algo = document.getElementById("algorithm").value;
  const requests = document
    .getElementById("requests")
    .value.split(",")
    .map(Number);
  const head = parseInt(document.getElementById("head").value);

  let result = { sequence: [], totalSeek: 0 };

  if (algo === "FCFS") result = fcfs(requests, head);
  else if (algo === "SSTF") result = sstf(requests, head);
  else if (algo === "SCAN") result = scan(requests, head);

  drawChart([head, ...result.sequence], result.totalSeek);
}

function fcfs(requests, head) {
  let total = 0;
  let current = head;
  const sequence = [];

  for (let r of requests) {
    total += Math.abs(current - r);
    sequence.push(r);
    current = r;
  }

  return { sequence, totalSeek: total };
}

function sstf(requests, head) {
  let reqs = [...requests];
  let current = head;
  let sequence = [];
  let total = 0;

  while (reqs.length) {
    let closest = reqs.reduce((a, b) =>
      Math.abs(a - current) < Math.abs(b - current) ? a : b
    );
    total += Math.abs(current - closest);
    sequence.push(closest);
    current = closest;
    reqs.splice(reqs.indexOf(closest), 1);
  }

  return { sequence, totalSeek: total };
}

function scan(requests, head) {
  let diskSize = 200;
  let left = [], right = [];
  let current = head;
  let sequence = [];
  let total = 0;

  for (let r of requests) {
    if (r < head) left.push(r);
    else right.push(r);
  }

  left.sort((a, b) => a - b);
  right.sort((a, b) => a - b);

  for (let r of right) {
    total += Math.abs(current - r);
    sequence.push(r);
    current = r;
  }

  total += Math.abs(current - (diskSize - 1));
  current = diskSize - 1;

  for (let r of left.reverse()) {
    total += Math.abs(current - r);
    sequence.push(r);
    current = r;
  }

  return { sequence, totalSeek: total };
}

function drawChart(sequence, totalSeek) {
  const ctx = document.getElementById("seekChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = sequence.map((_, i) => `Step ${i}`);
  const data = {
    labels: labels,
    datasets: [
      {
        label: "Head Position",
        data: sequence,
        fill: false,
        borderColor: "blue",
        backgroundColor: "blue",
        tension: 0.1,
        pointRadius: 6,
        pointBackgroundColor: "red",
        pointHoverRadius: 8,
      },
    ],
  };

  chartInstance = new Chart(ctx, {
    type: "line",
    data: data,
    options: {
      responsive: true,
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: {
          display: true,
        },
        tooltip: {
          callbacks: {
            label: (context) => `Cylinder: ${context.raw}`,
          },
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "Cylinder Number",
          },
          min: 0,
          max: 200,
        },
        x: {
          title: {
            display: true,
            text: "Steps",
          },
        },
      },
    },
  });

  document.getElementById("totalSeek").textContent = `Total Seek Time: ${totalSeek}`;
}

let comparisonChart = null;

function compareAlgorithms() {
  const requests = document
    .getElementById("requests")
    .value.split(",")
    .map(Number);
  const head = parseInt(document.getElementById("head").value);

  if (isNaN(head) || requests.some(isNaN)) {
    alert("Please enter valid head and request values.");
    return;
  }

  const fcfsResult = fcfs(requests, head);
  const sstfResult = sstf(requests, head);
  const scanResult = scan(requests, head);

  const labels = ["FCFS", "SSTF", "SCAN"];
  const seekTimes = [
    fcfsResult.totalSeek,
    sstfResult.totalSeek,
    scanResult.totalSeek,
  ];

  const ctx = document.getElementById("comparisonChart").getContext("2d");

  if (comparisonChart) comparisonChart.destroy();

  comparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Seek Time",
          data: seekTimes,
          backgroundColor: ["#3498db", "#2ecc71", "#e74c3c"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Seek Time: ${context.raw}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Total Seek Time",
          },
        },
        x: {
          title: {
            display: true,
            text: "Algorithms",
          },
        },
      },
    },
  });
}

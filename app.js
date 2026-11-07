
const GOMBE = {
  latitude: 10.29,
  longitude: 11.17
};

const periodSelect = document.getElementById("period");
const statusBox = document.getElementById("status");

let observations = [];

function average(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function trend(values) {
  const valid = values.filter(Number.isFinite);

  if (valid.length < 3) return "Insufficient data";

  const n = valid.length;
  const xMean = (n - 1) / 2;
  const yMean = average(valid);

  let numerator = 0;
  let denominator = 0;

  valid.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });

  const slope = numerator / denominator;

  if (slope > 0.02) return "Increasing";
  if (slope < -0.02) return "Decreasing";
  return "Relatively stable";
}

async function loadNASAData() {
  const months = Number(periodSelect.value);

  statusBox.textContent = "Connecting to NASA POWER...";

  document.getElementById("rain").textContent = "--";
  document.getElementById("temp").textContent = "--";

  const now = new Date();
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth() + 1;

  const startDate = new Date(
    Date.UTC(endYear, endMonth - 1 - months + 1, 1)
  );

  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth() + 1;

  const start = `${startYear}${String(startMonth).padStart(2, "0")}`;
  const end = `${endYear}${String(endMonth).padStart(2, "0")}`;

  const url = new URL(
    "https://power.larc.nasa.gov/api/temporal/monthly/point"
  );

  url.search = new URLSearchParams({
    parameters: "T2M,PRECTOTCORR",
    community: "AG",
    longitude: GOMBE.longitude,
    latitude: GOMBE.latitude,
    start,
    end,
    format: "JSON"
  });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NASA API error: ${response.status}`);
    }

    const result = await response.json();

    const parameters =
      result.properties?.parameter || result.parameters;

    if (!parameters?.T2M || !parameters?.PRECTOTCORR) {
      throw new Error("NASA data format was not recognized.");
    }

    const temperatures = parameters.T2M;
    const rainfall = parameters.PRECTOTCORR;

    observations = Object.keys(temperatures)
      .filter(key =>
        /^\d{6}$/.test(key) &&
        temperatures[key] !== -999 &&
        rainfall[key] !== -999 &&
        Number.isFinite(Number(temperatures[key])) &&
        Number.isFinite(Number(rainfall[key]))
      )
      .sort()
      .map(key => ({
        date: key,
        temperature: Number(temperatures[key]),
        rainfall: Number(rainfall[key])
      }))
      .slice(-months);

    if (!observations.length) {
      throw new Error("No valid observations were returned.");
    }

    displayResults();

  } catch (error) {
    console.error(error);
    statusBox.textContent =
      "Unable to load NASA data. Please check your internet and try again.";
    document.getElementById("insight").textContent =
      "No conclusion can be made until valid NASA observations are available.";
  }
}

function displayResults() {
  const temperatures = observations.map(x => x.temperature);
  const rainfall = observations.map(x => x.rainfall);

  const avgTemp = average(temperatures);
  const avgRain = average(rainfall);

  document.getElementById("temp").textContent =
    avgTemp.toFixed(1) + " °C";

  document.getElementById("rain").textContent =
    avgRain.toFixed(2) + " mm/day";

  const tempTrend = trend(temperatures);
  const rainTrend = trend(rainfall);

  document.getElementById("insight").textContent =
    `Across ${observations.length} valid monthly observations, ` +
    `temperature shows a ${tempTrend.toLowerCase()} trend, while ` +
    `precipitation shows a ${rainTrend.toLowerCase()} trend. ` +
    `These are exploratory linear trends, not statistical significance tests.`;

  document.querySelector(".card p").textContent =
    "Monthly average precipitation rate (mm/day)";

  statusBox.textContent =
    `NASA POWER data loaded successfully · ${observations.length} months · Gombe, Nigeria`;

  drawChart();
}

function drawChart() {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  const width = canvas.clientWidth;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.clearRect(0, 0, width, height);

  const left = 38;
  const right = 12;
  const top = 25;
  const bottom = 35;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const maxRain = Math.max(
    1,
    ...observations.map(x => x.rainfall)
  );

  const minTemp = Math.min(
    ...observations.map(x => x.temperature)
  );

  const maxTemp = Math.max(
    ...observations.map(x => x.temperature)
  );

  const tempRange = Math.max(1, maxTemp - minTemp);

  ctx.font = "10px Arial";
  ctx.fillStyle = "#42e6a4";
  ctx.fillText("Rainfall", left, 12);

  ctx.fillStyle = "#58b8ff";
  ctx.fillText("Temperature", left + 75, 12);

  const slot = plotWidth / observations.length;
  const barWidth = Math.max(2, slot * 0.55);

  observations.forEach((item, index) => {
    const x = left + index * slot + slot / 2;

    const barHeight =
      (item.rainfall / maxRain) * plotHeight;

    ctx.fillStyle = "rgba(66,230,164,0.65)";
    ctx.fillRect(
      x - barWidth / 2,
      top + plotHeight - barHeight,
      barWidth,
      barHeight
    );
  });

  ctx.beginPath();
  ctx.strokeStyle = "#58b8ff";
  ctx.lineWidth = 2;

  observations.forEach((item, index) => {
    const x = left + index * slot + slot / 2;
    const y =
      top + plotHeight -
      ((item.temperature - minTemp) / tempRange) * plotHeight;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = "#9bb8c2";
  ctx.textAlign = "center";

  [0, Math.floor(observations.length / 2),
   observations.length - 1].forEach(index => {
    if (index < 0) return;

    const date = observations[index].date;
    ctx.fillText(
      date.slice(0, 4) + "/" + date.slice(4, 6),
      left + index * slot + slot / 2,
      height - 10
    );
  });
}

periodSelect.addEventListener("change", loadNASAData);

window.addEventListener("resize", () => {
  if (observations.length) drawChart();
});

loadNASAData();
  

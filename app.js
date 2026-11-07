
const API_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";

const LATITUDE = 10.29;
const LONGITUDE = 11.17;

const periodSelect = document.getElementById("period");
const statusElement = document.getElementById("status");
const rainfallElement = document.getElementById("rain");
const temperatureElement = document.getElementById("temp");
const insightElement = document.getElementById("insight");
const chartCanvas = document.getElementById("chart");

async function loadNASAData() {
  statusElement.textContent = "Connecting to NASA POWER...";

  rainfallElement.textContent = "--";
  temperatureElement.textContent = "--";
  insightElement.textContent = "Waiting for NASA observations...";

  try {
    const months = Number(periodSelect.value);

    const now = new Date();

    // Use the last completed month
    const endDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    );

    const endYear = endDate.getUTCFullYear();
    const endMonth = endDate.getUTCMonth() + 1;

    const startDate = new Date(
      Date.UTC(endYear, endMonth - months, 1)
    );

    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth() + 1;

    const formatDate = function (year, month) {
      return String(year) + String(month).padStart(2, "0");
    };

    const start = formatDate(startYear, startMonth);
    const end = formatDate(endYear, endMonth);

    const requestURL = new URL(API_URL);

    requestURL.search = new URLSearchParams({
      parameters: "T2M,PRECTOTCORR",
      community: "AG",
      longitude: String(LONGITUDE),
      latitude: String(LATITUDE),
      start: start,
      end: end,
      format: "JSON"
    }).toString();

    const response = await fetch(requestURL);

    if (!response.ok) {
      throw new Error("NASA server error: " + response.status);
    }

    const data = await response.json();

    const parameters = data.properties.parameter;

    const temperatureData = parameters.T2M;
    const rainfallData = parameters.PRECTOTCORR;

    const dates = Object.keys(temperatureData).sort();

    const observations = [];

    for (const date of dates) {
      const temperature = Number(temperatureData[date]);
      const rainfall = Number(rainfallData[date]);

      if (
        Number.isFinite(temperature) &&
        Number.isFinite(rainfall) &&
        temperature !== -999 &&
        rainfall !== -999
      ) {
        observations.push({
          date: date,
          temperature: temperature,
          rainfall: rainfall
        });
      }
    }

    if (observations.length === 0) {
      throw new Error("No valid NASA observations were found.");
    }

    const average = function (values) {
      let total = 0;

      for (const value of values) {
        total += value;
      }

      return total / values.length;
    };

    const temperatures = observations.map(function (item) {
      return item.temperature;
    });

    const rainfallValues = observations.map(function (item) {
      return item.rainfall;
    });

    const averageTemperature = average(temperatures);
    const averageRainfall = average(rainfallValues);

    rainfallElement.textContent =
      averageRainfall.toFixed(2) + " mm/day";

    temperatureElement.textContent =
      averageTemperature.toFixed(1) + " °C";

    statusElement.textContent =
      "NASA POWER data loaded successfully. " +
      observations.length + " monthly observations.";

    insightElement.textContent =
      "Analysis of Gombe climate data over " +
      observations.length +
      " months shows an average temperature of " +
      averageTemperature.toFixed(1) +
      " °C and an average precipitation rate of " +
      averageRainfall.toFixed(2) +
      " mm/day. These are descriptive averages, not proof of climate change.";

    drawChart(observations);

  } catch (error) {
    console.error("EarthPulse AI error:", error);

    statusElement.textContent =
      "NASA data error: " + error.message;

    insightElement.textContent =
      "No conclusion can be made until valid NASA observations are available. " +
      "Please check your internet connection and try again.";

    rainfallElement.textContent = "--";
    temperatureElement.textContent = "--";
  }
}

function drawChart(observations) {
  const context = chartCanvas.getContext("2d");

  const width = chartCanvas.width;
  const height = chartCanvas.height;

  context.clearRect(0, 0, width, height);

  if (observations.length === 0) {
    return;
  }

  const values = observations.map(function (item) {
    return item.temperature;
  });

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const difference = maximum - minimum || 1;

  context.beginPath();
  context.strokeStyle = "#38bdf8";
  context.lineWidth = 3;

  values.forEach(function (value, index) {
    const x = 25 +
      (index / Math.max(values.length - 1, 1)) *
      (width - 50);

    const y = height - 25 -
      ((value - minimum) / difference) *
      (height - 50);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.stroke();

  context.fillStyle = "#ffffff";
  context.font = "12px Arial";
  context.fillText(
    "Monthly temperature trend (°C)",
    10,
    15
  );
}

periodSelect.addEventListener("change", loadNASAData);

loadNASAData();

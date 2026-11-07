
const NASA_API =
  "https://power.larc.nasa.gov/api/temporal/monthly/point";

const GOMBE_LATITUDE = 10.29;
const GOMBE_LONGITUDE = 11.17;

const periodSelect = document.getElementById("period");
const statusElement = document.getElementById("status");
const rainElement = document.getElementById("rain");
const tempElement = document.getElementById("temp");
const insightElement = document.getElementById("insight");
const chartCanvas = document.getElementById("chart");

async function loadNASAData() {
  statusElement.textContent = "Connecting to NASA POWER...";
  rainElement.textContent = "--";
  tempElement.textContent = "--";
  insightElement.textContent = "Loading climate observations...";

  try {
    const selectedMonths = Number(periodSelect.value);

    if (![12, 36, 60].includes(selectedMonths)) {
      throw new Error("Invalid analysis period.");
    }

    // NASA POWER monthly meteorological data is available
    // through the previous calendar year.
    const endYear = new Date().getUTCFullYear() - 1;

    const startYear =
      endYear - Math.ceil(selectedMonths / 12) + 1;

    const requestURL = new URL(NASA_API);

    requestURL.search = new URLSearchParams({
      parameters: "T2M,PRECTOTCORR",
      community: "AG",
      longitude: String(GOMBE_LONGITUDE),
      latitude: String(GOMBE_LATITUDE),
      start: String(startYear),
      end: String(endYear),
      format: "JSON"
    }).toString();

    const response = await fetch(requestURL);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        "NASA HTTP " + response.status + ": " +
        errorText.slice(0, 250)
      );
    }

    const data = await response.json();

    if (
      !data.properties ||
      !data.properties.parameter
    ) {
      throw new Error("NASA response has no climate parameters.");
    }

    const parameters = data.properties.parameter;

    const temperatures = parameters.T2M;
    const rainfall = parameters.PRECTOTCORR;

    if (!temperatures || !rainfall) {
      throw new Error("Temperature or rainfall data is missing.");
    }

    const temperatureDates = Object.keys(temperatures).sort();

    const observations = [];

    for (const date of temperatureDates) {
      const temperature = Number(temperatures[date]);
      const precipitation = Number(rainfall[date]);

      if (
        Number.isFinite(temperature) &&
        Number.isFinite(precipitation) &&
        temperature !== -999 &&
        precipitation !== -999
      ) {
        observations.push({
          date: date,
          temperature: temperature,
          rainfall: precipitation
        });
      }
    }

    const selectedObservations =
      observations.slice(-selectedMonths);

    if (selectedObservations.length === 0) {
      throw new Error("NASA returned no valid observations.");
    }

    function calculateAverage(values) {
      let total = 0;

      for (const value of values) {
        total += value;
      }

      return total / values.length;
    }

    const temperatureValues =
      selectedObservations.map(function (item) {
        return item.temperature;
      });

    const rainfallValues =
      selectedObservations.map(function (item) {
        return item.rainfall;
      });

    const averageTemperature =
      calculateAverage(temperatureValues);

    const averageRainfall =
      calculateAverage(rainfallValues);

    rainElement.textContent =
      averageRainfall.toFixed(2) + " mm/day";

    tempElement.textContent =
      averageTemperature.toFixed(1) + " °C";

    statusElement.textContent =
      "NASA POWER connected successfully. " +
      selectedObservations.length +
      " monthly observations loaded.";

    insightElement.textContent =
      "For Gombe State, the average temperature across " +
      selectedObservations.length +
      " available monthly observations is " +
      averageTemperature.toFixed(1) +
      " °C. The average precipitation rate is " +
      averageRainfall.toFixed(2) +
      " mm/day. These are descriptive averages, not a climate-change prediction.";

    drawChart(selectedObservations);

  } catch (error) {
    console.error("EarthPulse AI:", error);

    statusElement.textContent =
      "NASA data error: " + error.message;

    rainElement.textContent = "--";
    tempElement.textContent = "--";

    insightElement.textContent =
      "NASA observations could not be loaded. " +
      error.message;

    if (chartCanvas) {
      const context = chartCanvas.getContext("2d");
      context.clearRect(
        0,
        0,
        chartCanvas.width,
        chartCanvas.height
      );
    }
  }
}

function drawChart(observations) {
  if (!chartCanvas) {
    return;
  }

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
    const x =
      25 +
      (index / Math.max(values.length - 1, 1)) *
      (width - 50);

    const y =
      height - 25 -
      ((value - minimum) / difference) *
      (height - 55);

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
    "Average monthly temperature (°C)",
    10,
    15
  );
}

periodSelect.addEventListener("change", loadNASAData);

loadNASAData();


"use strict";

// EARTHPULSE AI - NASA POWER DATA ENGINE

const NASA_API =
  "https://power.larc.nasa.gov/api/temporal/monthly/point";

const GOMBE = {
  latitude: 10.29,
  longitude: 11.17
};

// Connect HTML elements
const periodSelect = document.getElementById("period");
const statusBox = document.getElementById("status");
const rainBox = document.getElementById("rain");
const tempBox = document.getElementById("temp");
const insightBox = document.getElementById("insight");
const chart = document.getElementById("chart");

// Load NASA data
async function loadNASAData() {
  statusBox.textContent = "Connecting to NASA POWER...";
  rainBox.textContent = "--";
  tempBox.textContent = "--";
  insightBox.textContent = "Loading NASA observations...";

  try {
    const months = Number(periodSelect.value);

    if (![12, 36, 60].includes(months)) {
      throw new Error("Invalid analysis period.");
    }

    // NASA monthly meteorological data is available
    // through the previous calendar year.
    const endYear = new Date().getUTCFullYear() - 1;
    const startYear = endYear - (months / 12) + 1;

    const requestURL = new URL(NASA_API);

    const params = new URLSearchParams();

    params.set("parameters", "T2M,PRECTOTCORR");
    params.set("community", "AG");
    params.set("longitude", String(GOMBE.longitude));
    params.set("latitude", String(GOMBE.latitude));
    params.set("start", String(startYear));
    params.set("end", String(endYear));
    params.set("format", "JSON");

    requestURL.search = params.toString();

    const response = await fetch(requestURL.toString());

    if (!response.ok) {
      const errorMessage = await response.text();

      throw new Error(
        "NASA HTTP " + response.status + ": " +
        errorMessage.slice(0, 300)
      );
    }

    const data = await response.json();

    if (
      !data.properties ||
      !data.properties.parameter
    ) {
      throw new Error("NASA returned an unexpected data format.");
    }

    const temperatureData =
      data.properties.parameter.T2M;

    const rainfallData =
      data.properties.parameter.PRECTOTCORR;

    if (!temperatureData || !rainfallData) {
      throw new Error("NASA climate parameters are missing.");
    }

    // Select the requested monthly observations
    const allDates = Object.keys(temperatureData).sort();

    const observations = [];

    for (const date of allDates) {
      const year = Number(date.substring(0, 4));

      if (year < startYear || year > endYear) {
        continue;
      }

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
      throw new Error("No valid monthly observations were found.");
    }

    // Calculate averages
    function getAverage(values) {
      let total = 0;

      for (const value of values) {
        total += value;
      }

      return total / values.length;
    }

    const temperatures = observations.map(
      function (item) {
        return item.temperature;
      }
    );

    const rainfallValues = observations.map(
      function (item) {
        return item.rainfall;
      }
    );

    const averageTemperature = getAverage(temperatures);
    const averageRainfall = getAverage(rainfallValues);

    // Display results
    rainBox.textContent =
      averageRainfall.toFixed(2) + " mm/day";

    tempBox.textContent =
      averageTemperature.toFixed(1) + " °C";

    statusBox.textContent =
      "NASA POWER connected successfully. " +
      observations.length + " observations loaded.";

    // Correct the rainfall description
    rainBox.nextElementSibling.textContent =
      "Average precipitation rate (mm/day)";

    // Generate a descriptive insight
    insightBox.textContent =
      "NASA POWER climate observations for Gombe State " +
      "covering " + observations.length + " months. " +
      "The average temperature is " +
      averageTemperature.toFixed(1) + " °C, while " +
      "the average precipitation rate is " +
      averageRainfall.toFixed(2) + " mm/day. " +
      "These are historical averages, not a weather forecast " +
      "or proof of climate change.";

    // Draw the chart
    drawChart(observations);

  } catch (error) {
    console.error("EarthPulse AI:", error);

    statusBox.textContent =
      "NASA data error: " + error.message;

    rainBox.textContent = "--";
    tempBox.textContent = "--";

    insightBox.textContent =
      "NASA observations could not be loaded. " +
      error.message;

    if (chart) {
      const context = chart.getContext("2d");

      context.clearRect(
        0,
        0,
        chart.width,
        chart.height
      );
    }
  }
}

// Draw monthly temperature chart
function drawChart(observations) {
  if (!chart) {
    return;
  }

  const context = chart.getContext("2d");

  const width = chart.width;
  const height = chart.height;

  context.clearRect(0, 0, width, height);

  if (observations.length === 0) {
    return;
  }

  const values = observations.map(
    function (item) {
      return item.temperature;
    }
  );

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const difference = maximum - minimum || 1;

  // Draw chart line
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
      (height - 60);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.stroke();

  // Chart title
  context.fillStyle = "#ffffff";
  context.font = "12px Arial";

  context.fillText(
    "Monthly temperature (°C)",
    10,
    15
  );
}

// Reload when analysis period changes
periodSelect.addEventListener(
  "change",
  loadNASAData
);

// Start the application
loadNASAData();

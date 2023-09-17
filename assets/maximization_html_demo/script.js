const width = 500;
const height = 500;
const gridSize = 20;  // Each point in the 25x25 space is 20x20 pixels
const optimizationWidth = 25;  // 25 points wide
const optimizationHeight = 25;  // 25 points tall

const svg = d3.select("#plot").append("svg").attr("width", width).attr("height", height);
let currentPoint = { x: 10, y: 10 };


// Example functions
const functions = {
    f1: (x, y) => Math.sin(x) * Math.cos(y),
    f2: (x, y) => x * y * 0.01,
    f3: (x, y) => -((x - 12) ** 2 + (y - 12) ** 2) * 0.01,
    f4: (x, y) => Math.sin(Math.sqrt(x ** 2 + y ** 2) * 0.2),
    f5: (x, y) => 0.5* Math.exp(-((x - 5) ** 2 + (y - 5) ** 2) * 0.25) + 2* Math.exp(-((x - 20) ** 2 + (y - 20) ** 2) * 0.25)
};

const populationSize = 50;
let currentPopulation = [];
for (let i = 0; i < populationSize; i++) {
  currentPopulation.push({
      x: Math.floor(Math.random() * optimizationWidth),
      y: Math.floor(Math.random() * optimizationHeight)
  });
}


// Optimizers
const optimizers = {
    hillClimb: (x, y, f) => {
        // Basic hill climber logic
        let values = [
            f(x + 1, y),
            f(x - 1, y),
            f(x, y + 1),
            f(x, y - 1)
        ];
        let maxVal = Math.max(...values);

        if (maxVal === values[0]) return { x: x + 1, y: y };
        if (maxVal === values[1]) return { x: x - 1, y: y };
        if (maxVal === values[2]) return { x: x, y: y + 1 };
        if (maxVal === values[3]) return { x: x, y: y - 1 };
        return { x, y };
    },
    simAnneal: (x, y, f) => {
        let temperature = 1000;
        const coolingRate = 0.995;

        let currentSolution = { x, y };
        let currentVal = f(x, y);

        // Pick a random neighbor
        let randomStep = Math.random() > 0.5 ? 1 : -1;
        let newSolution = {
            x: x + (Math.random() > 0.5 ? randomStep : 0),
            y: y + (Math.random() <= 0.5 ? randomStep : 0)
        };

        let newVal = f(newSolution.x, newSolution.y);

        if (acceptanceProbability(currentVal, newVal, temperature) > Math.random()) {
            currentSolution = newSolution;
        }

        temperature *= coolingRate;

        return currentSolution;
    },
    geneticAlgorithm: (population, f) => {
        // Selection based on fitness
        population.sort((a, b) => f(b.x, b.y) - f(a.x, a.y));
        let selected = population.slice(0, populationSize / 2);  // Select top 50%

        // Crossover
        let children = [];
        while (children.length + selected.length < populationSize) {
            let parent1 = selected[Math.floor(Math.random() * selected.length)];
            let parent2 = selected[Math.floor(Math.random() * selected.length)];
            let child = {
                x: (parent1.x + parent2.x) / 2 + (Math.random() - 0.5) * gridSize,
                y: (parent1.y + parent2.y) / 2 + (Math.random() - 0.5) * gridSize
            };
            children.push(child);
        }

        // Mutation
        children.forEach(child => {
            if (Math.random() < 0.1) {  // 10% mutation rate
                child.x += (Math.random() - 0.5) * gridSize;
                child.y += (Math.random() - 0.5) * gridSize;
            }
        });

        // Replacement
        return selected.concat(children);
    }
};




function acceptanceProbability(currentValue, newValue, temperature) {
    if (newValue > currentValue) {
        return 1.0;
    }
    return Math.exp((newValue - currentValue) / temperature);
}

function optimizeStep() {
    let funcName = document.getElementById("functionSelect").value;
    let selectedFunction = functions[funcName]
    let optName = document.getElementById("optimizerSelect").value;

        if (optimizerSelect.value === "geneticAlgorithm") {
        currentPopulation = optimizers[optName](currentPopulation, selectedFunction);
    } else {
    currentPoint = optimizers[optName](currentPoint.x, currentPoint.y, selectedFunction);
    }
    drawPlot(selectedFunction);
}


function getColorForValue(value) {
    const scaledValue = (value + 1) / 2;  // Scale between 0 and 1
    return d3.interpolate("white", "red")(scaledValue);
}

function drawPlot(func) {
    // Clear previous contents
    svg.selectAll("*").remove();

    // Draw the contour plot (tile plot)
    for (let i = 0; i < optimizationWidth; i++) {
        for (let j = 0; j < optimizationHeight; j++) {
            let x = i;
            let y = j;
            let canvasX = i * gridSize;
            let canvasY = j * gridSize;
            let value = func(x, y);

            let color = getColorForValue(value / 2);

            svg.append("rect")
                .attr("x", canvasX)
                .attr("y", canvasY)
                .attr("width", gridSize)
                .attr("height", gridSize)
                .attr("fill", color);
        }
    }

    // Draw x and y axis labels
    svg.append("text")
        .attr("x", width - 10)
        .attr("y", height - 10)
        .attr("text-anchor", "end")
        .text("X");

    svg.append("text")
        .attr("x", 10)
        .attr("y", 10)
        .attr("alignment-baseline", "hanging")
        .text("Y");

    // Draw the current point or population
    if (optimizerSelect.value === "geneticAlgorithm") {
        svg.selectAll(".dot").data(currentPopulation).enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => d.x * gridSize + gridSize / 2)  // Center the dot within the square
            .attr("cy", d => d.y * gridSize + gridSize / 2)  // Center the dot within the square
            .attr("r", 3)
            .attr("fill", "blue");
    } else {
        svg.append("circle")
            .attr("cx", currentPoint.x * gridSize + gridSize / 2) // Center the dot within the square
            .attr("cy", currentPoint.y * gridSize + gridSize / 2) // Center the dot within the square
            .attr("r", 5)
            .attr("fill", "blue");
    }
}


// Initialize
function initialize() {
    drawPlot(functions.f1);
}

initialize();

document.getElementById('optimizerSelect').addEventListener('change', function() {
    if (this.value === 'geneticAlgorithm') {
        // Reset population
        currentPopulation = [];
        for (let i = 0; i < populationSize; i++) {
          currentPopulation.push({
              x: Math.floor(Math.random() * optimizationWidth),
              y: Math.floor(Math.random() * optimizationHeight)
          });
        }
    }
    else{
          currentPoint = { x: 10, y: 10 }

    }
    let funcName = document.getElementById("functionSelect").value;
    drawPlot(functions[funcName]);
});


document.getElementById('functionSelect').addEventListener('change', function() {
      let funcName = document.getElementById("functionSelect").value;
    // // Reset population if the Genetic Algorithm is selected
    // if (optimizerSelect.value === 'geneticAlgorithm') {
    //     currentPopulation = [];
    //     for (let i = 0; i < populationSize; i++) {
    //         currentPopulation.push({
    //             x: Math.random() * width,
    //             y: Math.random() * height
    //         });
    //     }
    // }
    currentPoint = { x: 10, y: 10 }
    drawPlot(functions[funcName]);
});

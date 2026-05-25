const URL = "model/";

let model, webcam, labelContainer, maxPredictions;

// ===============================
// BUFFER DE ESTABILIZACIÓN
// ===============================
let predictionBuffer = [];

const BUFFER_SIZE = 5;

async function init() {

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);

    maxPredictions = model.getTotalClasses();

    const flip = true;

    webcam = new tmImage.Webcam(400, 400, flip);

    await webcam.setup();

    await webcam.play();

    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container")
        .appendChild(webcam.canvas);

    labelContainer =
        document.getElementById("label-container");

    for (let i = 0; i < maxPredictions; i++) {

        const div = document.createElement("div");

        div.className = "prediction";

        div.innerHTML = `
            <div class="label">Clase</div>

            <div class="bar-container">
                <div class="bar"></div>
            </div>
        `;

        labelContainer.appendChild(div);
    }
}

async function loop() {

    webcam.update();

    await predict();

    window.requestAnimationFrame(loop);
}

async function predict() {

    // ===============================
    // MEDIR LATENCIA
    // ===============================
    const startTime = performance.now();

    const prediction =
        await model.predict(webcam.canvas);

    const endTime = performance.now();

    const latency =
        (endTime - startTime).toFixed(2);

    document.getElementById("latency").innerText =
        `Inferencia: ${latency} ms`;

    // ===============================
    // BUSCAR MEJOR PREDICCIÓN
    // ===============================
    let bestPrediction = null;

    let highestProbability = 0;

    for (let i = 0; i < maxPredictions; i++) {

        if (prediction[i].probability >
            highestProbability) {

            highestProbability =
                prediction[i].probability;

            bestPrediction = prediction[i];
        }
    }

    // ===============================
    // AGREGAR AL BUFFER
    // ===============================
    predictionBuffer.push(bestPrediction.className);

    // mantener máximo 5 frames
    if (predictionBuffer.length > BUFFER_SIZE) {

        predictionBuffer.shift();
    }

    // ===============================
    // VOTO MAYORITARIO
    // ===============================
    const votes = {};

    predictionBuffer.forEach(item => {

        votes[item] = (votes[item] || 0) + 1;
    });

    let dominantClass = null;

    let maxVotes = 0;

    for (const className in votes) {

        if (votes[className] > maxVotes) {

            maxVotes = votes[className];

            dominantClass = className;
        }
    }

    // ===============================
    // UMBRAL DE CONFIANZA
    // ===============================
    const threshold = 0.85;

    if (highestProbability < threshold) {

        document.getElementById("status-message")
            .innerText = "Objeto no identificado";

        return;
    }

    // ===============================
    // MOSTRAR RESULTADO ESTABLE
    // ===============================
    document.getElementById("status-message")
        .innerText =
        `Detectando: ${dominantClass}`;

    // ===============================
    // ACTUALIZAR BARRAS
    // ===============================
    for (let i = 0; i < maxPredictions; i++) {

        const probability =
            (prediction[i].probability * 100)
            .toFixed(2);

        const className =
            prediction[i].className;

        const predictionDiv =
            labelContainer.childNodes[i];

        predictionDiv.querySelector(".label")
            .innerHTML =
            `${className}: ${probability}%`;

        predictionDiv.querySelector(".bar")
            .style.width =
            `${probability}%`;
    }
}

init();
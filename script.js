import { ObjectDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
const demosSection = document.getElementById("demos");
let objectDetector;
let runningMode = "IMAGE";
// Initialize the object detector
const initializeObjectDetector = async () => {
    console.log("Initialisation de l'objet détecteur...");
    try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm");
        console.log("Vision tasks résolu.");
        objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `efficientdet_lite2.tflite`,
                delegate: "GPU"
            },
            scoreThreshold: 0.5,
            runningMode: runningMode
        });
        console.log("Objet détecteur initialisé.");
        demosSection.classList.remove("invisible");
        console.log("Section 'demos' rendue visible.");
    } catch (error) {
        console.error("Erreur lors de l'initialisation de l'objet détecteur :", error);
    }
};
initializeObjectDetector();
/********************************************************************
 // Demo 2: Continuously grab image from webcam stream and detect it.
 ********************************************************************/
let video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
let enableWebcamButton;
// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
// Keep a reference of all the child elements we create
// so we can remove them easilly on each render.
var children = [];
// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
}
else {
    console.warn("getUserMedia() is not supported by your browser");
}
// Enable the live webcam view and start detection.
async function enableCam(event) {
    if (!objectDetector) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
    }
    // Hide the button.
    enableWebcamButton.classList.add("removed");
    // getUsermedia parameters
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    })
        .catch((err) => {
        console.error(err);
        /* handle the error */
    });
}
let lastVideoTime = -1;
async function predictWebcam() {
    // if image mode is initialized, create a new classifier with video runningMode.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await objectDetector.setOptions({ runningMode: "VIDEO" });
    }
    let startTimeMs = performance.now();
    // Detect objects using detectForVideo.
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const detections = objectDetector.detectForVideo(video, startTimeMs);
        displayVideoDetections(detections);
    }
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
}
function displayVideoDetections(result) {
    // Remove any highlighting from previous frame.
    for (let child of children) {
        liveView.removeChild(child);
    }
    children.splice(0);
    // Iterate through predictions and draw them to the live view
    for (let detection of result.detections) {
        const p = document.createElement("p");
        p.innerText =
            detection.categories[0].categoryName +
                " - with " +
                Math.round(parseFloat(detection.categories[0].score) * 100) +
                "% confidence.";
        p.style =
            "left: " +
                (video.offsetWidth -
                    detection.boundingBox.width -
                    detection.boundingBox.originX) +
                "px;" +
                "top: " +
                detection.boundingBox.originY +
                "px; " +
                "width: " +
                (detection.boundingBox.width - 10) +
                "px;";
        const highlighter = document.createElement("div");
        highlighter.setAttribute("class", "highlighter");
        highlighter.style =
            "left: " +
                (video.offsetWidth -
                    detection.boundingBox.width -
                    detection.boundingBox.originX) +
                "px;" +
                "top: " +
                detection.boundingBox.originY +
                "px;" +
                "width: " +
                (detection.boundingBox.width - 10) +
                "px;" +
                "height: " +
                detection.boundingBox.height +
                "px;";
        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        // Store drawn objects in memory so they are queued to delete at next call.
        children.push(highlighter);
        children.push(p);
    }
}
//
const imageUpload = document.getElementById('imageUpload');
const uploadedImageContainer = document.getElementById('uploadedImageContainer');

imageUpload.addEventListener('change', handleImageUpload);

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
        URL.revokeObjectURL(img.src);
        uploadedImageContainer.innerHTML = ''; // Clear previous image
        uploadedImageContainer.appendChild(img);

        if (!objectDetector) {
            alert("Object Detector is still loading. Please try again.");
            return;
        }

        if (runningMode === "VIDEO") {
            runningMode = "IMAGE";
            await objectDetector.setOptions({ runningMode: "IMAGE" });
        }

        const detections = await objectDetector.detect(img);
        displayImageDetections(detections, img);
    };
}
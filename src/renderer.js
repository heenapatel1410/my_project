const { ipcRenderer } = require('electron');
const io = require('socket.io-client');

// Establish socket connection
const socket = io('http://192.168.2.120:3000');

// DOM Elements
const startSharingBtn = document.getElementById('start-sharing-btn');
const stopSharingBtn = document.getElementById('stop-sharing-btn');
const remoteScreenCanvas = document.getElementById('remote-screen-canvas');
const ctx = remoteScreenCanvas.getContext('2d');

const fileInput = document.getElementById('file-input');
const sendFileBtn = document.getElementById('send-file-btn');
const receivedFilesDiv = document.getElementById('received-files');
const videoElement = document.getElementById('videoElement');


socket.on('connect', () => {
    console.log('Connected to server');
});


let interval;
let mediaStream = null;
startSharingBtn.addEventListener('click', async () => {
    console.log('Starting screen share');
    ipcRenderer.send('get-sources');
    socket.emit('start-screen-share');

    startSharingBtn.style.display = 'none';
    stopSharingBtn.style.display = 'inline-block';
});

ipcRenderer.on('sources-received', async (event, sources) => {
    const screenSource = sources[0]//find(source => source.name === 'Entire Screen'); // or another source name

    const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenSource.id
            }
        }
    });

    videoElement.srcObject = mediaStream;
    videoElement.play();

    // Start capturing and sending data
    captureScreenData();
});

function captureScreenData() {
    setInterval(() => {

        const canvasCtx = remoteScreenCanvas.getContext('2d');
        remoteScreenCanvas.width = videoElement.videoWidth;
        remoteScreenCanvas.height = videoElement.videoHeight;

        canvasCtx.drawImage(videoElement, 0, 0);

        // Get the canvas image data in base64 format
        const screenData = remoteScreenCanvas.toDataURL('image/jpeg');

        // Send the base64-encoded image data via socket
        socket.emit('screen-data', screenData);
        console.log("capture data");
    }, 100); // Capture at 30 FPS
}

stopSharingBtn.addEventListener('click', () => {

    socket.emit('stop-screen-share');
    stopSharingBtn.style.display = 'none';
    startSharingBtn.style.display = 'inline-block';
});


// Listening to screen data from the server
socket.on('screen-data', (imageData) => {
    console.log('Received screen data from server');
    const img = new Image();
    img.src = imageData;
    // console.log('Image src:', img.src);

    img.onload = () => {
        console.log('Image loaded:', img.width, img.height);
        const remoteCanvas = document.getElementById('remoteCanvas');
        if (!remoteCanvas) {
            console.error('Canvas element not found');
            return;
        }
        const remoteCtx = remoteCanvas.getContext('2d');
        if (!remoteCtx) {
            console.error('Failed to get canvas 2D context');
            return;
        }
        remoteCtx.drawImage(img, 0, 0, remoteCanvas.width, remoteCanvas.height);
        console.log('Image loaded successfully');
    };
    img.onerror = (error) => {
        console.error('Error loading image:', error);
    };
});

// File sharing functionality
sendFileBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result;
            console.log('Sending file:', file.name, fileData);
            socket.emit('send-file', { name: file.name, data: fileData });
        };
        reader.readAsArrayBuffer(file);
    } else {
        console.error('No file selected');
    }
});

// Receiving files
socket.on('receive-file', (file) => {
    console.log('Received file:', file);
    console.log('File name:', file.name);
    console.log('File data:', file.data);
    const arrayBuffer = new Uint8Array(file.data);

    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.textContent = `Download ${file.name}`;
    a.click();
    receivedFilesDiv.appendChild(a);
    receivedFilesDiv.appendChild(document.createElement('br'));
});


function logout() {
    // Redirect to the login page
    window.location.href = './login.html'; // Change this to your actual login page URL
}


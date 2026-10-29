window.dmxUniverse = new Array(513).fill(0);
window.fixtureTypes = new Object;
const socket = io();
let FADER_COUNT = 16;
let selectedCoords = {x:0,y:0};
let lastVal = 0;
let shiftPressed = false;
let scenesActive = false;
const THROTTLE_MS = 5; // Aby sme nezahltili sieť

function switchBottomTab(tabName) {
    const tabDirect = document.getElementById('tab-direct-faders');
    const tabScenes = document.getElementById('tab-scene-faders');
    const btnDirect = document.getElementById('btn-tab-direct');
    const btnScenes = document.getElementById('btn-tab-scenes');
    const btnCreateScene = document.getElementById("btn-open-blockly");

    if (tabName === 'direct') {
        socket.emit("req_dmx_faders_update");
        scenesActive = false;
        //tabDirect.style.display = 'block';
        //tabScenes.style.display = 'none';
        btnCreateScene.style.display = "none";
        btnDirect.classList.add('active');
        btnScenes.classList.remove('active');
    } else if (tabName === 'scenes') {
        socket.emit("req_scene_faders_update");
        scenesActive = true;
        //tabDirect.style.display = 'none';
        //tabScenes.style.display = 'block';
        btnCreateScene.style.display = "block";
        btnDirect.classList.remove('active');
        btnScenes.classList.add('active');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const availableWidth = window.innerWidth - 60;
    const maxFaders = Math.floor(availableWidth / 50);
    
    //FADER_COUNT = maxFaders < 23 ? maxFaders : 23;
    //if (FADER_COUNT < 4) FADER_COUNT = 4;
    

    generateFaders();
    
});

document.addEventListener("keydown", (e) => {
    shiftPressed = e.shiftKey;
});

document.addEventListener("keyup", (e) => {
    shiftPressed = e.shiftKey;
});

function generateFaders() {
    // generate for Fixtures
    const faderBox = document.getElementById('fader-box');
    if (faderBox) {

        for (let i = 1; i <= FADER_COUNT; i++) {
            const group = document.createElement('div');
            group.className = 'fader-channel';
            group.dataset.max = 255;
            group.dataset.steps = 12;
            group.dataset.channel = i;

            group.innerHTML = `
            <button class="flash-btn"
            onmousedown=""
            ontouchstart=""
            ontouchend=""
            data-channel=${i}>
            ${i}
            </button>

            <div class="fader-track">
            <div class="visual-layer"></div>
            <input type="range" class="actual-input" data-channel=${i}>
            </div>

            `;
            //<div class="channel-label">CH ${i}</div>

            faderBox.appendChild(group);
        }
    }

    initConsole();
}

function render_faders() {

}


function initConsole() {
    const channels = document.querySelectorAll('.fader-channel');

    channels.forEach(channel => {
        const visualLayer = channel.querySelector('.visual-layer');
        const input = channel.querySelector('.actual-input');
        const flashBtn = channel.querySelector('.flash-btn');

        const max = parseInt(channel.dataset.max) || 255;
        const numSteps = parseInt(channel.dataset.steps) || 15;
        const stepVal = max / numSteps;

        input.max = max;
        input.value = 0;

        // Generovanie krokov
        const glowElements = [];
        for (let i = 0; i < numSteps; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            const glow = document.createElement('div');
            glow.className = 'glow';
            step.appendChild(glow);
            visualLayer.appendChild(step);
            glowElements.push(glow);
        }

        const channelInput = (val, e=null) => {
            const relChannel = parseInt(input.dataset.channel); 
            const numVal = parseInt(val);
            
            if (typeof selectedFixtures !== "undefined"){
                selectedFixtures.forEach(fixture => {
                    const absChannel = parseInt(fixture.address) + (relChannel - 1);
                    window.dmxUniverse[absChannel] = numVal;
                });
            }
            if (e){
                sendDmx(
                    e.target.dataset.channel,
                    val
                );
            }

            if (typeof updateStageVisuals === "function") updateStageVisuals();

            // Update Visuals
            const activeRatio = val / stepVal;
            glowElements.forEach((glow, index) => {
                let opacity = Math.min(Math.max(activeRatio - index, 0), 1);
                glow.style.opacity = opacity;
            });
        };

        // Eventy pre slider
        input.addEventListener('input', (e) => channelInput(e.target.value, e));

        input.syncFromNetwork = (val) => {
            const activeRatio = val / stepVal;
            glowElements.forEach((glow, index) => {
                let opacity = Math.min(Math.max(activeRatio - index, 0), 1);
            });
            input.value = val;
            channelInput(val);
        }
        
        flashBtn.addEventListener('mousedown', (e) => {
            lastVal = input.value;
            input.value = max;
            channelInput(max, e);
        });

        flashBtn.addEventListener('mouseup', (e) => {
            if(shiftPressed) { input.value = 0; }
            else             { input.value = lastVal; }
            channelInput(lastVal, e);
        });

        flashBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            lastVal = input.value;
            input.value = max;
            channelInput(max, e);
        });
        flashBtn.addEventListener('touchend', (e) => {
            if(shiftPressed) { input.value = 0; }
            else             { input.value = lastVal; }
            channelInput(lastVal, e);
        });
    });
}


let throttleTimer = null;
let lastSendTime = 0;

function throttledSendChange(channel, value) {
    const now = Date.now();
    if (now - lastSendTime > THROTTLE_MS) {
        socket.emit('fader_change', { channel: channel, value: value, state: scenesActive });
        lastSendTime = now;
        console.log("DMX fader sent");

    } else {
        clearTimeout(throttleTimer);
        throttleTimer = setTimeout(() => {
            socket.emit('fader_change', { channel: channel, value: value, state: scenesActive });
            lastSendTime = Date.now();
        },THROTTLE_MS);
    }
}


function sendDmx(channel, value) {
    throttledSendChange(channel, value);

    /*const slider = document.querySelector(`.vertical-dmx[data-channel="${channel}"]`);
    if (slider) {
        slider.value = value; 
    }
    socket.emit('update_dmx', { channel: channel, value: value });
    */
}

socket.on("load_dmx_signal", (dmx) => {
    window.dmxUniverse = dmx;
})


socket.on("sync_ui_faders", (data) =>{
    for (let i = 0; i < data.length; i++) {
        const slider = document.querySelector(`.actual-input[data-channel="${i+1}"]`);
        if (slider && typeof slider.syncFromNetwork === "function") { 
            slider.syncFromNetwork(data[i]);
        };
    }
});

socket.on("sync_dmx_faders", (data) =>{
    if (scenesActive) return;

    const slider = document.querySelector(`.actual-input[data-channel="${data.channel}"]`);
    if (slider && typeof slider.syncFromNetwork === "function") { 
        slider.syncFromNetwork(data.value);
    };
});

socket.on("sync_scene_faders", (data) =>{
    if (!scenesActive) return;
     
    const slider = document.querySelector(`.actual-input[data-channel="${data.channel}"]`);
    if (slider && typeof slider.syncFromNetwork === "function") { 
        slider.syncFromNetwork(data.value);
    };
});

/*
 #55A5E6  *
 #519BD7
 #4C91C9
 #4887BA
 #447DAB
 #3F739C
 #3B698E
 #375F7F
 #325470
 #2E4A62
 #294053
 #253644
 #212C35
 #1C2227
 #181818*/

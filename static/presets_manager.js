let selectedPresetCoords = null;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("preset-form")
    const canvas = document.getElementById("preset-canvas");
    const btnClose = document.getElementById("close-preset-modal");
    const btnRemove = document.getElementById("btn-remove-preset");
    const modal = document.getElementById("preset-modal");

    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let isDrawing = false;

    // Nastavenie štýlu čiary pre kreslenie ikonky
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Vyčistenie pozadia pri štarte (čierne plátno)
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // Myšové udalosti
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Dotykové udalosti pre tablety / mobily
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);

    // Tlačidlo na vymazanie plátna
    const clearBtn = document.getElementById("clear-canvas-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }

    form.onsubmit = (e) => {
        e.preventDefault();

        const name = document.getElementById("preset-name").value;
        const canvas = document.getElementById("preset-canvas");
        const icon = canvas ? canvas.toDataURL("image/png") : null;

        if (!selectedPresetCoords) return;

        const data = {
            name: document.getElementById("preset-name").value,
            icon: icon,
            x: selectedPresetCoords.x,
            y: selectedPresetCoords.y,
        };

        console.log(data);
        socket.emit('add_preset', data);
        
        modal.style.display = "none";
        selectedPresetCoords = null;
        form.reset();
    };

    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    btnClose.onclick = (e) => {
        modal.style.display = "none";
    };

    btnRemove.onclick = (e) => {
        socket.emit("remove_preset", selectedPresetCoords);
    }

    socket.emit("load_presets");
});



function renderPresetsGrid(presets) {
    const grid = document.getElementById('preset-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const ROWS = 10;
    const COLS = 8;

    for (let i = 0; i < (ROWS * COLS); i++) {
        const x = i % COLS;
        const y = Math.floor(i / COLS);
        
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        const preset = presets.find(p => p.x === x && p.y === y);
        
        if (preset) {
            preset["index"] = presets.indexOf(preset);
            const number = preset.index + 1;
            
            // Vykreslenie uloženej ikonky z canvasu (base64 image) alebo fallback ikona
            const iconHtml = preset.icon 
                ? `<img class="preset-img" src="${preset.icon}" alt="${preset.name}" style="width: 75px; height: 75px; object-fit: contain; border-radius: 4px;">` 
                : '<div class="preset-icon">⚡</div>';

            cell.innerHTML = `
                <div class="preset-icon">${iconHtml}</div>
                <div class="fix-label">${preset.name}</div>
            `;
            
            // Kliknutie na existujúci preset – spustí ho (jednorazová akcia)
            cell.onclick = () => {
                if (typeof socket !== 'undefined') {
                    selectedPresetCoords = { x, y };
                    socket.emit("execute_preset", preset.id);
                }
            };
        } else {
            // Prázdne políčko – kliknutie otvorí modal na vytvorenie presetu
            cell.innerHTML = '<span style="opacity: 0.2; font-size: 20px;">+</span>';
            cell.onclick = () => {
                selectedPresetCoords = { x, y };

                // Vyčistenie textového poľa
                const nameInput = document.getElementById("preset-name");
                if (nameInput) nameInput.value = "";

                // Vyčistenie canvasu na čierno
                const canvas = document.getElementById("preset-canvas");
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                
                // Zobrazenie modal okna
                const modal = document.getElementById("preset-modal");
                if (modal) modal.style.display = "block";
            };
        }
        grid.appendChild(cell);
    }
}


socket.on("render_presets", (matrix_data) => {
    renderPresetsGrid(Object.values(matrix_data));
    window.presetMatrix = matrix_data;
    refresh_preset_options();

})
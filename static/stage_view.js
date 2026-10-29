function switchRightTab(tabName) {
    const tabColors = document.getElementById('tab-colors-gobos');
    const tabStage = document.getElementById('tab-stage-view');
    const btnColors = document.getElementById('btn-tab-colors');
    const btnStage = document.getElementById('btn-tab-stage');

    if (tabName === 'colors') {
        tabColors.style.display = 'block';
        tabStage.style.display = 'none';
        btnColors.classList.add('active');
        btnStage.classList.remove('active');
    } else if (tabName === 'stage') {
        tabColors.style.display = 'none';
        tabStage.style.display = 'block';
        btnColors.classList.remove('active');
        btnStage.classList.add('active');

        // Po prepnutí vyrenderujeme aktuálny stav svetiel
        if (typeof renderStageView === 'function') {
            renderStageView();
        }
    }
}

function renderStageView() {
    const canvas = document.getElementById('stage-canvas');
    if (!canvas || !fixturesMatrix) return;
    
    canvas.innerHTML = '';

    // OPRAVA 1: Pridali sme 'index' do loopu pre unikátne ID
    fixturesMatrix.forEach((fixture, index) => {
        if (fixture.type === 'group') return;

        const el = document.createElement('div');
        el.className = 'stage-fixture';
        // OPRAVA 1: Používame index na zabezpečenie unikátneho ID pre každé svetlo
        el.id = `stage-fix-id-${index}`; 
        
        let posX = fixture.stage_x !== undefined ? fixture.stage_x : (fixture.x * 12 + 5);
        let posY = fixture.stage_y !== undefined ? fixture.stage_y : (fixture.y * 12 + 5);

        el.style.left = `${posX}%`;
        el.style.top = `${posY}%`;

        el.innerHTML = `<div class="stage-lens"></div>`;
        
        if (selectedFixtures.find(f => f.number === fixture.number)) el.classList.add("active");

        let isDragging = false;
        const startDrag = (e) => { isDragging = true; el.style.cursor = "grabbing"; };
        const onDrag = (e) => {
            if (!isDragging) return;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let newLeft = Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100));
            let newTop = Math.max(0, Math.min(((clientY - rect.top) / rect.height) * 100, 100));
            el.style.left = `${newLeft}%`;
            el.style.top = `${newTop}%`;
        };
        const stopDrag = (e) => {
            if (isDragging) {
                isDragging = false;
                el.style.cursor = "grab";
                fixture.stage_x = parseFloat(el.style.left);
                fixture.stage_y = parseFloat(el.style.top);
            }
        };

        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, {passive: false});
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, {passive: false});
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        canvas.appendChild(el);
    });

    updateStageVisuals();
}

function updateStageVisuals() {
    if (!fixturesMatrix || document.getElementById("tab-stage-view").style.display === "none") return; 

    fixturesMatrix.forEach((fixture, index) => {
        if (fixture.type === 'group') return;

        // OPRAVA 1: Hľadáme pomocou nového unikátneho ID
        const el = document.getElementById(`stage-fix-id-${index}`); 
        if (!el) return; 
        const lens = el.querySelector('.stage-lens'); 
        if (!lens) return; 

        const base = parseInt(fixture.address); 
        const profile = window.fixtureTypes[fixture.type] || window.fixtureTypes['led_par'];

        if (!profile || !profile.offsets) return;
        
        const dimVal = window.dmxUniverse[base + profile.offsets.dimmer] || 0; 
        const intensity = dimVal / 255; 

        let bgStyle = "black";
        let shadowStyle = "none";

        if (intensity > 0) {
            if (profile.mode === 'rgb') {
                const r = window.dmxUniverse[base + profile.offsets.r] || 0; 
                const g = window.dmxUniverse[base + profile.offsets.g] || 0; 
                const b = window.dmxUniverse[base + profile.offsets.b] || 0; 
                
                bgStyle = `rgb(${r}, ${g}, ${b})`;
                shadowStyle = `0 0 ${20 * intensity}px ${10 * intensity}px rgba(${r}, ${g}, ${b}, ${intensity})`;
            } 
            else if (profile.mode === 'wheel') {
                const colorVal = window.dmxUniverse[base + profile.offsets.color] || 0;
                
                let activeSlot = profile.wheel.find(slot => colorVal >= slot.range[0] && colorVal <= slot.range[1]);
                
                // OPRAVA 2: Fallback ak si posunul fader nad hodnotu 49. Použijeme poslednú známu farbu z configu.
                if (!activeSlot && profile.wheel.length > 0) {
                    const lastSlot = profile.wheel[profile.wheel.length - 1];
                    if (colorVal > lastSlot.range[1]) activeSlot = lastSlot;
                }
                
                if (activeSlot) {
                    if (activeSlot.colors.length === 1) {
                        const [r, g, b] = activeSlot.colors[0];
                        bgStyle = `rgb(${r}, ${g}, ${b})`;
                        shadowStyle = `0 0 ${20 * intensity}px ${10 * intensity}px rgba(${r}, ${g}, ${b}, ${intensity})`;
                        
                    } else if (activeSlot.colors.length === 2) {
                        const [r1, g1, b1] = activeSlot.colors[0];
                        const [r2, g2, b2] = activeSlot.colors[1];
                        
                        bgStyle = `linear-gradient(90deg, rgb(${r1},${g1},${b1}) 50%, rgb(${r2},${g2},${b2}) 50%)`;
                        shadowStyle = `
                            -10px 0 ${15 * intensity}px rgba(${r1}, ${g1}, ${b1}, ${intensity}), 
                             10px 0 ${15 * intensity}px rgba(${r2}, ${g2}, ${b2}, ${intensity})
                        `;
                    }
                } else {
                    bgStyle = "white";
                    shadowStyle = `0 0 ${20 * intensity}px ${10 * intensity}px rgba(255, 255, 255, ${intensity})`;
                }
            }
            
            lens.style.background = bgStyle;
            lens.style.boxShadow = shadowStyle;
            lens.style.opacity = intensity; 
            
        } else {
            lens.style.background = "black";
            lens.style.boxShadow = "none"; 
            lens.style.opacity = 0.3; 
        }
    });
}

socket.on("dmx_universe_update", data => {
    // OPRAVA 3: Data z pythonového `bytearray` prichádzajú ako binárny ArrayBuffer. 
    // Musíme ho skonvertovať na Uint8Array, inak indexovanie `window.dmxUniverse[x]` vráti vždy undefined.
    window.dmxUniverse = data
    updateStageVisuals();
});
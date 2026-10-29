let selectedFixtures = [];
let fixturesMatrix;
let clickTimeout = null;
const DBCLICK_DELAY = 250;


// Icon mapping for fixtures
const TYPE_ICONS = {
    'led_par':      '<img src="/static/assets/led_par.svg">',      
    'led_wash':     '<img src="/static/assets/wash.svg">',     
    'moving_head':  '<img src="/static/assets/moving_head.svg">',
    'group':        '<img src="/static/assets/group.svg" >'
};

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("fixture-modal");
    const addBtn = document.querySelector(".btn-accent"); 
    const closeBtn = document.querySelector(".close-modal");
    const removeBtn = document.getElementsByClassName("btn-remove")[0];
    const form = document.getElementById("fixture-form");
    const btnHome = document.getElementsByClassName("btn-home")[0];

    // Otvorenie modalov
    addBtn.onclick = () => modal.style.display = "block";

    // Zatvorenie x-kom
    closeBtn.onclick = () => modal.style.display = "none";

    btnHome.onclick = (event) => {
        if(clickTimeout !== null){
            clearTimeout(clickTimeout);
            clickTimeout = null;

            // Double click
            socket.emit("save_home_position");
            btnHome.style.background = "#00d03e"
            setTimeout(() => {
                btnHome.style.background = "#1a1a1a"
            }, 750)
        } else {
            clickTimeout = setTimeout(() => {
                clickTimeout = null;
            
                // Single click
                socket.emit("load_home_position");
                
                btnHome.style.background = "#0026d0"
                setTimeout(() => {
                    btnHome.style.background = "#1a1a1a"
                }, 750)

            }, DBCLICK_DELAY);
        }
    }

    // Zatvorenie kliknutím mimo okna
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    removeBtn.onclick = (event) => {
        remove_fixtures();
    }

    // Spracovanie formu
    form.onsubmit = (e) => {
        e.preventDefault();

        let type = document.getElementById("fix-type").value;
        let group = "";
        let icon = window.fixtureTypes[type].icon;
        if(type == "group") group = document.getElementById("fix-label").value;
            
        const data = {
            label: document.getElementById("fix-label").value,
            address: document.getElementById("fix-address").value,
            number: document.getElementById("fix-num").value,
            icon: icon,
            type: type,
            group: group,
            x: selectedCoords.x,
            y: selectedCoords.y,
            selected_fixtures: selectedFixtures
        };

        selectedFixtures = [];
        
        socket.emit('add_fixture', data);
        
        modal.style.display = "none";
        form.reset();
    };

    socket.emit("load_fixtures");
    socket.emit("DMC_loaded");
});

socket.on("update_fixtures", (fixtures) => {
    renderFixtureGrid(fixtures);
    fixturesMatrix = fixtures;

    if(typeof renderStageView === "function"){
        renderStageView();
    }
});

socket.on("render_fixture_types", (types) => {
    render_fixture_types(types);
});


function renderFixtureGrid(fixtures) {
    const grid = document.getElementById('fixture-grid');
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

        const fixture = fixtures.find(f => f.x === x && f.y === y);
        
        if (fixture) {
            fixture["index"] = fixtures.indexOf(fixture);
            const number = fixture.number;
            const icon = TYPE_ICONS[fixture.icon] || '❓';

            cell.dataset.group = fixture.group

            cell.innerHTML = `
                <div class="fix-index">${number}</div>
                <div class="fix-icon">${icon}</div>
                <div class="fix-label">${fixture.label}</div>
                ${fixture.type !== 'group' ? `<div class="fix-addr">A: ${fixture.address}</div>` : ''}
            `;
            
            cell.onclick = (e) => {
                if(fixture.type == "group"){
                    let grouped = document.querySelectorAll('[data-group="'+fixture.group+'"]');
                    grouped.forEach(groupedCell => {
                        const cell_x = groupedCell.dataset.x;
                        const cell_y = groupedCell.dataset.y;
                        const cellFixture = fixturesMatrix.find(f => f.x == cell_x && f.y == cell_y);
                        
                        if(cellFixture){
                            
                            if(groupedCell.classList.contains("active")) {
                                groupedCell.classList.remove("active")
                                
                                const index = selectedFixtures.findIndex(f => f.x === cellFixture.x && f.y === cellFixture.y);
                                selectedFixtures.splice(index, 1);
    
                            } else {
                                console.log("adding class");
                                groupedCell.classList.add("active");
                                selectedFixtures.push(cellFixture);
                            } 
                        }

                    });
                    socket.emit("handle_selection", selectedFixtures);
                    return;
                }
                
                if(cell.classList.contains("active")){
                    cell.classList.remove("active");
                    // OPRAVA: Porovnávame podľa súradníc x a y namiesto priamej referencie na objekt
                    let _i = selectedFixtures.findIndex(f => f.x === fixture.x && f.y === fixture.y);
                    if (_i !== -1) {
                        selectedFixtures.splice(_i, 1);
                    }
                }
                else{
                    cell.classList.add("active");
                    selectedFixtures.push(fixture);
                }
                socket.emit("handle_selection", selectedFixtures);
            };
        } else {
            cell.innerHTML = '<span style="opacity: 0.2; font-size: 20px;">+</span>';
            cell.onclick = () => {

                const _select = document.getElementById("fix-type");
                const groupOpt = document.getElementById("opt-group");

                if (selectedFixtures.length > 1) {
                    groupOpt.hidden = false;
                    _select.value = "group";
                } else {
                    groupOpt.hidden = true;
                    if (_select.value === "group") {
                        _select.value = "moving_head"; 
                    }
                }
                
                selectedCoords = { x, y };
                document.getElementById("fixture-modal").style.display = "block";
            };
        }
        grid.appendChild(cell);
    }
}

function remove_fixtures(){
    const positions = selectedFixtures.map(fixture => ({x: fixture.x, y: fixture.y}));
    console.log(positions);
    socket.emit("rm_fixture", positions);
    selectedFixtures = [];
}

function render_fixture_types(types){
    //console.log(types);
    window.fixtureTypes = types;
    let _select = document.getElementById("fix-type");
    let values = Object.keys(types);
    //let names = Object.values(types);

    //console.log(values);

    values.forEach(value => {
        const option = document.createElement("option");
        
        option.value = value; 
        option.textContent = types[value]["textName"]; 
        
        _select.appendChild(option);
    });

}

// === GLOBÁLNA SELEKCIA: Synchronizácia so serverom ===
socket.on("sync_selection", (serverSelection) => {
    // Prepíšeme lokálnu premennú tým, čo reálne eviduje server
    selectedFixtures = serverSelection;

    // 1. Aktualizácia Grid View (štvorčeková mriežka)
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach(cell => {
        const cx = parseInt(cell.dataset.x);
        const cy = parseInt(cell.dataset.y);
        
        // Zistíme, či je táto pozícia (x,y) v aktuálnej selekcii zo servera
        const isSelected = selectedFixtures.some(f => f.x === cx && f.y === cy);
        
        if (isSelected) {
            cell.classList.add('active');
        } else {
            cell.classList.remove('active');
        }
    });

    // 2. Aktualizácia Stage View (ak je zobrazený a existuje)
    if (typeof fixturesMatrix !== "undefined") {
        fixturesMatrix.forEach((fixture, index) => {
            // Predpokladá úpravu s unikátnymi ID ("stage-fix-id-X"), ktorú sme robili minule
            const el = document.getElementById(`stage-fix-id-${index}`); 
            if (el) {
                // Pre stage view je bezpečnejšie porovnávať podľa unikátnych súradníc x a y
                const isSelected = selectedFixtures.some(f => f.x === fixture.x && f.y === fixture.y);
                if (isSelected) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            }
        });
    }
});
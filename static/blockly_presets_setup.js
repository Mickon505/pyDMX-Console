let workspacePresets = null;
let toolboxPresets = null;

/**
 * Resolves a fixture's unique ID from its type and its per-type number.
 * Numbers are unique within one fixture type, so (type, number) identifies a single fixture.
 * Returns null if no such fixture exists (e.g. it was removed).
 */
function resolveFixtureId(type, number) {
    if (typeof fixturesMatrix === "undefined" || !fixturesMatrix) return null;

    const fixture = fixturesMatrix.find(f =>
        f.type === type && String(f.number) === String(number)
    );
    return fixture ? fixture.id : null;
}

/**
 * Returns dropdown options (the per-type fixture numbers) for the given fixture type.
 * Evaluated every time a dropdown opens, so it always reflects the current fixtures.
 */
function getNumberOptions(type) {
    const options = [];

    if (typeof fixturesMatrix !== "undefined" && fixturesMatrix) {
        fixturesMatrix.forEach(_fix => {
            if (_fix.type == type) {
                options.push([String(_fix.number), String(_fix.number)]);
            }
        });
    }

    if (options.length == 0) options.push(["None", "None"]);
    return options;
}

/** Call after fixtures were added / removed so Blockly picks up the change. */
function onFixturesChanged() {
    if (!workspacePresets) return;   // Blockly not initialised yet, it will read fresh data on init

    refresh_fixtures();

    // Re-validate blocks already placed in the workspacePresets (their dropdown options are dynamic now)
    workspacePresets.getAllBlocks(false).forEach(block => {
        if (block.type.startsWith("fixture_")) {
            const field = block.getField("NUMBER_INPUT");
            if (field) field.getOptions(false);
            block.render();
        }
    });
}

function refresh_fixtures(){
    // Mutate in place so the toolboxPresets keeps pointing at the same array
    fixturesContents.length = 0;

    Object.entries(window.fixtureTypes).forEach(([key, fixture]) => {
        
        let attr_options = [];
        Object.entries(fixture.offsets).forEach(([name, channelOffset]) => {
            attr_options.push([String(name), String(name)]);
        });

        // safety checks
        if (attr_options.length == 0) attr_options.push(["None", "None"]);
        
        
        Blockly.Blocks[`fixture_${fixture.type}`] = {
            init: function() {
                this.jsonInit({
                    type: `fixture_${fixture.type}`,
                    message0: `${fixture.textName}  #%1 . %2 %3`,
                    args0: [
                        {
                            type: "field_dropdown",
                            name: "NUMBER_INPUT",
                            options: () => getNumberOptions(fixture.type)
                        },
                        {
                            type: "field_dropdown",
                            name: "ATTRIBUTE_NAME",
                            options: attr_options
                        },
                        {
                            type: "input_value",
                            name: "INPUT_VALUE",
                            check: "Number"
                        }
                    ],
                    previousStatement: null,
                    nextStatement: null,
                    colour: 120
                });
            }
        };
        
        python.pythonGenerator.forBlock[`fixture_${fixture.type}`] = function(block, generator) {
            const numberInput = block.getFieldValue("NUMBER_INPUT");
            const attrName = block.getFieldValue("ATTRIBUTE_NAME");
            const value = generator.valueToCode(block, "INPUT_VALUE", python.pythonGenerator.ORDER_ATOMIC);
            
            if(numberInput == "None" || attrName == "None") return "#";

            // The dropdown shows the per-type number, but the generated code uses the unique ID
            const fixtureId = resolveFixtureId(fixture.type, numberInput);
            if (!fixtureId) return `# fixture ${fixture.type} #${numberInput} not found\n`;
            
            const code = `Preset.set_fixture("${fixtureId}", "${attrName}", ${value})\n`;
            return code;
        }
        
        fixturesContents.push({kind: "block", type: `fixture_${fixture.type}`});
    
    });

    if(workspacePresets && toolboxPresets){
        workspacePresets.updateToolbox(toolboxPresets);
    }
}

function refresh_preset_options(){

    let name_options = [];
    Object.entries(window.presetMatrix).forEach(([key, preset]) => {
        
        name_options.push([String(preset.name), String(preset.id)]);
        
        // safety checks
        if (name_options.length == 0) name_options.push(["None", "None"]);    

    });

    Blockly.Blocks[`preset_pressed`] = {
        init: function() {
            this.jsonInit({
                type: `preset_pressed`,
                message0: `Preset "%1" pressed`,
                args0: [
                    {
                        type: "field_dropdown",
                        name: "NAME_INPUT",
                        options: name_options
                    }
                ],
                message1: "start sequence %1",
                args1: [
                    {
                        type: "input_statement",
                        name: "DO"
                    }
                ],
                colour: 60,
                hat: "cap",
                tooltip: "Activates and passes down the value of the fader"
            });
        }
    };
    
    python.pythonGenerator.forBlock[`preset_pressed`] = function(block, generator) {
        const idInput = block.getFieldValue("NAME_INPUT");
        let branchCode = generator.statementToCode(block, "DO");
        if (!branchCode) branchCode = "    pass\n";
        
        if(idInput == "None" || idInput == "None") return "#";

        const code = `def _${idInput}_pressed(sleep=Preset.custom_sleep):\n${branchCode}\nPreset.register_preset_callback(_${idInput}_pressed)\n`;
        return code;
    }

    if(workspacePresets && toolboxPresets){
        workspacePresets.updateToolbox(toolboxPresets);
    }
}

function initPresetBlockly() {
    if (workspacePresets) return;

    // Events
    refresh_preset_options();

    // Fixtures
    refresh_fixtures();
    
    
    // Control
    Blockly.Blocks["wait"] = {
        init: function() {
            this.jsonInit({
                type: "wait",
                message0: "Wait %1 second/s",
                args0: [
                    {
                        type: "field_input",
                        name: "TIME_INPUT",
                        text: "1"
                    }
                ],
                previousStatement: null,
                nextStatement: null,
                colour: 45
            });
        }
    };

    python.pythonGenerator.forBlock["wait"] = function(block, generator) {
        const time = block.getFieldValue("TIME_INPUT");
        const code = `sleep(${time})\n`;
        return code;
    }

    // Variables

    Blockly.Blocks["value"] = {
        init: function() {
            this.jsonInit({
                type: "value",
                message0: "%1",
                args0: [
                    {
                        type: "field_number",
                        name: "NUM_VAL",
                        value: 0,
                        min: 0,
                        max: 255
                    }
                ],
                output: "Number",
                colour: 230,
                tooltip: "Number value"
            });
        }
    };

    python.pythonGenerator.forBlock["value"] = function(block, generator) {
        const val = block.getFieldValue("NUM_VAL");
        return [val, python.pythonGenerator.ORDER_ATOMIC];
    }

    // Debug
    Blockly.Blocks["debug_print_text"] = {
        init: function() {
            this.jsonInit({
                type: "debug_print_text",
                message0: "Print \"%1\"",
                args0: [
                    {
                        type: "field_input",
                        name: "TEXT_INPUT"
                    }
                ],
                previousStatement: null,
                nextStatement: null,
                colour: 230 
            });
        }
    };
//-----------------------------------------
    Blockly.Blocks["debug_print"] = {
        init: function() {
            this.jsonInit({
                type: "debug_print",
                message0: "Print \"%1\"",
                args0: [
                    {
                        type: "input_value",
                        name: "TEXT_INPUT"
                    }
                ],
                previousStatement: null,
                nextStatement: null,
                colour: 230 
            });
        }
    };


    python.pythonGenerator.forBlock["debug_print"] = function(block, generator) {
        return "";
    }
//-----------------------------

    python.pythonGenerator.forBlock["debug_print_text"] = function(block, generator) {
        const value = block.getFieldValue("TEXT_INPUT")
        const code = `print("${value}")\n`;
        return code;
    }

    Blockly.Blocks["debug_print_num"] = {
        init: function() {
            this.jsonInit({
                type: "debug_print_num",
                message0: "Print num %1",
                args0: [
                    {
                        type: "input_value",
                        name: "VALUE_INPUT"
                    }
                ],
                previousStatement: null,
                nextStatement: null,
                colour: 230 
            });
        }
    };


    python.pythonGenerator.forBlock["debug_print_num"] = function(block, generator) {
        const value = generator.valueToCode(block, "VALUE_INPUT", python.pythonGenerator.ORDER_ATOMIC);
        const code = `print(${value})\n`;
        return code;
    }

    
    toolboxPresets = {
        kind: "categoryToolbox",
        contents: [
            {
                kind: "category",
                name: "Events",
                colour: 60,
                contents: [
                    {kind: "block", type: "preset_pressed"}
                ]
            },
            {
                kind: "category",
                name: "Fixtures",
                colour: 120,
                contents: fixturesContents
            },
            {
                kind: "category",
                name: "Control",
                colour: 45,
                contents: [
                    {kind: "block", type: "wait"}
                    
                ]
            },
            {
                kind: "category",
                name: "Logic",
                colour: "%{BKY_MATH_HUE}",
                contents: [
                    {kind: "block", type: "controls_if"},
                    {kind: "block", type: "logic_compare"},
                    {kind: "block", type: "logic_operation"},
                    {kind: "block", type: "logic_negate"},
                    {kind: "block", type: "logic_boolean"}
                ]
            },
            {
                kind: "category",
                name: "Loops",
                colour: "%{BKY_LOOPS_HUE}",
                contents: [
                    {
                        kind: "block", 
                        type: "controls_repeat_ext",
                        inputs: {
                            TIMES: {shadow: {type: "math_number", fields: {NUM:10}}}
                        }
                    },
                    {kind: "block", type: "controls_whileUntil"},
                    {
                        kind: "block", 
                        type: "controls_for",
                        inputs: {
                            FROM: {shadow: {type: "math_number", fields: {NUM:1}}},
                            TO: {shadow: {type: "math_number", fields: {NUM:10}}},
                            BY: {shadow: {type: "math_number", fields: {NUM:1}}}
                        }
                    },
                    {kind: "block", type: "controls_forEach"},
                    {kind: "block", type: "controls_flow_statements"}
                ]
            },
            {
                kind: "category",
                name: "Math",
                colour: "%{BKY_MATH_HUE}",
                contents: [
                    {kind: "block", type: "math_number", fields: {NUM: 123}},
                    {
                        kind: "block", 
                        type: "math_arithmetic",
                        inputs: {
                            A: {shadow: {type: "math_number", fields: {NUM:1}}},
                            B: {shadow: {type: "math_number", fields: {NUM:10}}}
                        }
                    },
                    {
                        kind: "block", 
                        type: "math_single",
                        inputs: {
                            NUM: {shadow: {type: "math_number", fields: {NUM:9}}} 
                        }
                    },
                    {
                        kind: "block",
                        type: "math_trig",
                        inputs: {
                            NUM: {shadow: {type: "math_number", fields: {NUM:10}}}
                        }
                    },
                    {kind: "block", type: "math_constant"},
                    {
                        kind: "block",
                        type: "math_number_property",
                        inputs: {
                            NUMBER_TO_CHECK: {shadow: {type: "math_number", fields: {NUM:10}}}
                        }
                    },
                    {
                        kind: "block", 
                        type: "math_round",
                        inputs: {
                            NUM: {shadow: {type: "math_number", fields: {NUM:3.14}}}
                        }
                    },
                    {
                        kind: "block",
                        type: "math_modulo",
                        inputs: {
                            DIVIDEND: {shadow: {type: "math_number", fields: {NUM:64}}},
                            DIVISOR: {shadow: {type: "math_number", fields: {NUM:10}}}
                        }
                    },
                    {
                        kind: "block",
                        type: "math_constrain",
                        inputs: {
                            VALUE: {shadow: {type: "math_number", fields: {NUM:32}}},
                            LOW: {shadow: {type: "math_number", fields: {NUM:1}}},
                            HIGH: {shadow: {type: "math_number", fields: {NUM:50}}}
                        }
                    },
                    {
                        kind: "block", 
                        type: "math_random_int",
                        inputs: {
                            FROM: {shadow: {type: "math_number", fields: {NUM:1}}},
                            TO: {shadow: {type: "math_number", fields: {NUM:100}}}
                        }
                    },
                    {
                        kind: "block",
                        type: "math_atan2",
                        inputs: {
                            X: {shadow: {type: "math_number", fields: {NUM:1}}},
                            Y: {shadow: {type: "math_number", fields: {NUM:1}}}
                        }
                    }

                ]
            },
            {
                kind: "category",
                name: "Lists",
                colour: "%{BKY_LISTS_HUE}",
                contents: [
                    {kind: "block", type: "lists_create_empty"},
                    {kind: "block", type: "lists_create_with"},
                    {
                        kind: "block", 
                        type: "lists_repeat",
                        inputs: {
                            NUM: {shadow: {type: "math_number", fields: {NUM:5}}}
                        }
                    },
                    {kind: "block", type: "lists_length"},
                    {kind: "block", type: "lists_isEmpty"},
                    {kind: "block", type: "lists_indexOf"},
                    {kind: "block", type: "lists_getIndex"},
                    {kind: "block", type: "lists_setIndex"},
                    {kind: "block", type: "lists_getSublist"},
                    {kind: "block", type: "lists_sort"}
                ]
            },
            {
                kind: "category",
                name: "Variables",
                colour: 10,
                custom: "VARIABLE"
            },
            {
                kind: "category",
                name: "Functions",
                colour: 10,
                custom: "PROCEDURE"
            },
            {
                kind: "category",
                name: "Debug",
                colour: 210,
                contents: [
                    {kind: "block", type: "debug_print_text"},
                    {kind: "block", type: "debug_print_num"}

                ]
            },
        ]
    }

    // Vytvorenie pracovnej plochy Blockly
    workspacePresets = Blockly.inject('blockly-presets-div', {
        toolbox: toolboxPresets,
        scrollbars: true,
        trashcan: true,
        zoom: true
    });
}



function openBlocklyPresetsModal() {
    document.getElementById('blockly-preset-modal').style.display = 'block';
    Blockly.svgResize(workspacePresets);
}

function closeBlocklyPresetsModal() {
    document.getElementById('blockly-preset-modal').style.display = 'none';
}


function saveCurrentPresets(){
    const presetWorkspace = Blockly.serialization.workspaces.save(workspacePresets);
    let code = "from Modules.presets import Preset\nsleep = Preset.custom_sleep\n\n";
    code += python.pythonGenerator.workspaceToCode(workspacePresets);
    
    //console.log(code);
    socket.emit("save_preset", {preset_code: code, presets_workspace: presetWorkspace});
}

socket.on("load_presets_blockly_workspace", (state) => {
    setTimeout(() => {
        initPresetBlockly();
        Blockly.serialization.workspaces.load(state, workspacePresets);
    }, 2)
});
let workspace = null;
let toolbox = null;
let fixturesContents = [];

function refresh_fixtures(){
    fixturesContents = [];

    Object.entries(window.fixtureTypes).forEach(([key, fixture]) => {
        
        let attr_options = [];
        Object.entries(fixture.offsets).forEach(([name, channelOffset]) => {
            attr_options.push([String(name), String(name)]);
        });

        let num_options = [];

        fixturesMatrix.forEach(_fix => {
            if(_fix.type == fixture.type){
                num_options.push([String(_fix.number), String(_fix.number)]);
            }
        });


        // safety checks
        if (attr_options.length == 0) attr_options.push(["None", "None"]);
        if (num_options.length == 0) num_options.push(["None", "None"]);
        
        
        Blockly.Blocks[`fixture_${fixture.type}`] = {
            init: function() {
                this.jsonInit({
                    type: `fixture_${fixture.type}`,
                    message0: `${fixture.textName}  #%1 . %2 %3`,
                    args0: [
                        {
                            type: "field_dropdown",
                            name: "NUMBER_INPUT",
                            options: num_options
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
            
            const code = `Scene.set_fixture(${numberInput}, \"${attrName}\", ${value})\n`;
            return code;
        }
        
        fixturesContents.push({kind: "block", type: `fixture_${fixture.type}`});
    
    });

    if(workspace && toolbox){
        workspace.updateToolbox(toolbox);
    }
}

function initBlockly() {
    if (workspace) return;

    // Events
    Blockly.Blocks["on_fader_change"] = {
        init: function() {
            this.jsonInit({
                type: "on_fader_change",
                message0: "Fader #%1 on change with: %2",
                args0: [
                    {
                        type: "field_number",
                        name: "FADER_NUM",
                        value: 1,
                        min: 1,
                        max: 16
                    },
                    {
                        type: "field_variable",
                        name: "FADER_VAL",
                        variable: "fader_value"
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


    python.pythonGenerator.forBlock["on_fader_change"] = function(block, generator) {
        const faderNum = block.getFieldValue("FADER_NUM");
        const varName = generator.getVariableName(block.getFieldValue("FADER_VAL"));

        let branchCode = generator.statementToCode(block, "DO");
        if (!branchCode) branchCode = "    pass\n";

        const code = `def on_fader_${faderNum}(${varName}, sleep=Scene.custom_sleep):\n${branchCode}\nScene.register_fader_callback(${faderNum}, on_fader_${faderNum})\n`;
        return code;
    }

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

    
    const toolbox = {
        kind: "categoryToolbox",
        contents: [
            {
                kind: "category",
                name: "Events",
                colour: 60,
                contents: [
                    {kind: "block", type: "on_fader_change"}
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
    workspace = Blockly.inject('blockly-div', {
        toolbox: toolbox,
        scrollbars: true,
        trashcan: true,
        zoom: true
    });
}



function openBlocklyModal() {
    document.getElementById('blockly-modal').style.display = 'block';
    Blockly.svgResize(workspace);
}

function closeBlocklyModal() {
    document.getElementById('blockly-modal').style.display = 'none';
}


function saveCurrentScene(){
    const sceneWorkspace = Blockly.serialization.workspaces.save(workspace);
    let code = "from Modules.scene_code import Scene\nsleep = Scene.custom_sleep\n";
    code += python.pythonGenerator.workspaceToCode(workspace);
    let lines = code.split("\n");
    for (let i = 0; i < 10; i++) {   
        if (/^fader_value\s*=\s*(None|0)/.test(lines[i])) {
            lines[i] = "";
            break;
        }
    }
    code = lines.join("\n");
    console.log(code);
    socket.emit("save_scene", {scene_code: code, scene_workspace: sceneWorkspace});
}

socket.on("load_blockly_workspace", (state) => {
    setTimeout(() => {
        initBlockly();
        Blockly.serialization.workspaces.load(state, workspace);
    }, 2) // <-- wait a little so window.fixtureTypes can successfully load ALL fixtures
});

import time
import threading
import curses
import json
import os
import serial
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

import Modules.fixtures_handler as FH
import Modules.fixtures as FX
from Modules.dmx_signal import DMXSignal
from Modules.scene_code import Scene

class DMXApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app, cors_allowed_origins="*") 

        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.UNIVERSE_PATH = os.path.join(self.BASE_DIR, "static", "universes.json")
        self.SERIAL_PORT = "/dev/ttyS0"
        self.BAUD_RATE = 250000 


        self.dmx = DMXSignal()
        self.fixture_matrix = None
        self.fixture_selection = FH.FixtureSelection()
        self.scene_fp = "scenes/test.py"
        self.scenes_active = False

        ROWS = 10
        COLS = 8
        with open(self.UNIVERSE_PATH, "r") as f:
            data = json.load(f)
            self.fixture_matrix = FX.FixtureMatrix(data, (ROWS, COLS))

        Scene.setup(self.dmx, self.fixture_matrix, 16)

        try:
            self.ser = serial.Serial(self.SERIAL_PORT, self.BAUD_RATE, stopbits=2)
        except Exception as e:
            print(f"WARN: Serial port unavailable ({e}). Running only simulation")
            self.ser = None

        if os.path.exists(self.scene_fp):
            with open(self.scene_fp, "r") as f:
                scene_code = f.read()
                print("INFO: reloaded scenes")
                exec(scene_code) 

        self.setup_handlers()

    def send_dmx_packet(self):
        if not self.ser: 
            return
        
        try:
            self.ser.break_condition = True
            time.sleep(0.005)
            self.ser.break_condition = False
            time.sleep(0.0001)

            self.ser.write(self.dmx.get_universe_signals(1))

        except Exception as e:
            pass

    def dmx_worker(self):
        time.sleep(5) # wait for everything to initialize
        while True:
            self.send_dmx_packet()
            self.update_stageview()
            time.sleep(0.03) # 33Hz refresh rate
        
    def update_ui(self):
        """Frontend refresh function"""
        if self.fixture_matrix:
            data = self.fixture_matrix.to_dict()["universe-1"]
            self.socketio.emit("update_fixtures", data)

    def update_stageview(self):
        self.socketio.emit("dmx_universe_update", self.dmx.get_universe_signals(1))

    def setup_handlers(self):
        """SocketIO events"""


        @self.app.route("/")
        def index():
            return render_template("index.html")


        @self.socketio.on("DMC_loaded")
        def handle_connect():
            self.socketio.emit("load_dmx_signal", self.dmx.get_universe_signals(1))
            self.socketio.emit("render_fixture_types", FX.FIXTURE_TYPES.TYPES)
            with open("scenes/saved_workspace.json", "r") as f:
                state = json.loads(f.read())
                self.socketio.emit("load_blockly_workspace", state)

            self.socketio.emit("sync_ui_faders", Scene.get_dmx_channels())


        @self.socketio.on("load_fixtures")
        def load_fixtures():
            self.update_ui()
            if self.fixture_selection.selected:
                # Serializujeme vybrané inštancie triedy Fixture do slovníkov
                sel = [f.to_dict() for f in self.fixture_selection.selected if f]
                emit("sync_selection", sel)


        @self.socketio.on("fader_change")
        def handle_faders(data):
            channel = int(data["channel"])
            val = int(data["value"])
            scenes_active = bool(data["state"])

            if scenes_active:
                Scene.update_scene_faders(channel, val)
                emit("sync_scene_values", data, broadcast=True, include_self=False)
            
            else:

                self.fixture_selection.apply_signal(self.dmx, val, channel)
                Scene.update_dmx_faders(channel, val)
            
                emit("sync_dmx_values", data, broadcast=True, include_self=False)

    

        @self.socketio.on("req_dmx_faders_update")
        def update_dmx_ui_faders():
            emit("sync_ui_faders", Scene.get_dmx_channels(), include_self=True, broadcast=False)


        @self.socketio.on("req_scene_faders_update")
        def update_scene_ui_faders():
            emit("sync_ui_faders", Scene.get_scene_channels(), include_self=True, broadcast=False)


        @self.socketio.on("handle_selection")
        def handle_selection(data):
            self.fixture_selection.set_selection(data, self.fixture_matrix)

            sel = [f.to_dict() for f in self.fixture_selection.selected if f]
            emit("sync_selection", sel, broadcast=True)
        
        
        @self.socketio.on("save_scene")
        def save_scene(data):
            with open("scenes/test.py", "w") as f:
                f.write(data["scene_code"])

            with open("scenes/saved_workspace.json", "w") as f:
                f.write(json.dumps(data["scene_workspace"]))

            if os.path.exists(self.scene_fp):
                with open(self.scene_fp, "r") as f:
                    scene_code = f.read()
                    print("INFO: reloaded scenes")
                    exec(scene_code) 


        @self.socketio.on("add_fixture")
        def add_fixture(data):
            if not data: return
            self.fixture_matrix.set_fixture(data["x"], data["y"], data)
            self.fixture_matrix.save_to_file(self.UNIVERSE_PATH)
            self.update_ui()


        @self.socketio.on("rm_fixture")
        def remove_fixture(data):
            if not data: return
            for pos in data:
                self.fixture_matrix.remove_fixture(pos["x"], pos["y"])
            self.fixture_matrix.save_to_file(self.UNIVERSE_PATH)
            self.fixture_selection.set_selection({}, self.fixture_matrix)
            self.update_ui()

        @self.socketio.on("save_home_position")
        def save_home_pos():
            self.dmx.set_home_pos()

        @self.socketio.on("load_home_position")
        def save_home_pos():
            self.dmx.load_home_pos()
    
    
    def run(self):
        threading.Thread(target=self.dmx_worker, daemon=True).start()
        self.socketio.run(self.app, host="0.0.0.0", port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    controller = DMXApp()
    controller.run()

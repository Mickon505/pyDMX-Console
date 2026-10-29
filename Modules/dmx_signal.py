import threading

class DMXSignal:
    def __init__(self, faders_count: int = 16):
        self.lock = threading.Lock()
        self.universes = {1: ([0] * 513)}
        self.home_position = self.universes[1]

    def set_channel(self, universe, channel, value):
        with self.lock:
            universe = int(universe)
            channel = int(channel)
            value = int(value)
            if not (universe in self.universes):
                universe = 1

            
            channel = max(0, min(channel, 512))
            value = max(0, min(value, 255))

            self.universes[universe][channel] = value


    def get_channel(self, universe, channel):
        with self.lock:
            universe = int(universe)
            channel = int(channel)
            if not (universe in self.universes):
                universe = 1
            
            channel = max(0, min(channel, 512))

            return self.universes[universe][channel]


    def get_universe_signals(self, universe):
        with self.lock:
            universe = int(universe)
            if not (universe in self.universes):
                universe = 1

            return self.universes[universe]


    def add_universe(self):
        with self.lock:
            self.universes[len(self.universes) + 1] = [0] * 513


    def set_home_pos(self):
        self.home_position = self.universes[1]


    def load_home_pos(self, universe: int = 1):
        self.universes[universe] = self.home_position

from Modules.fixtures import Fixture, FixtureMatrix
from Modules.dmx_signal import DMXSignal
class FixtureSelection:
    def __init__(self):
        self.selected: list[Fixture] = []


    def set_selection(self, fixture_data: dict, fixture_matrix: FixtureMatrix):
        """Selects Fixture types from FixtureMatrix from passed data"""
        self.selected = [
            fixture_matrix.find_fixture(fixture["x"], fixture["y"]) for fixture in fixture_data
        ]


    def apply_signal(self, dmx_signal: DMXSignal, val: int, channel_offset: int):
        for fixture in self.selected:
            if fixture.fixture_type == "group": continue

            channel_index = int(fixture.DMX_addr) + int(channel_offset - 1)
            if 0 <= channel_index <= 512:
                _universe = 1
                dmx_signal.set_channel(_universe, channel_index, val)

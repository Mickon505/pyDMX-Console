import json
import os

class Fixture:
    def __init__(self, gridPos: tuple[int, int], DMX_addr: int, fixture_num: int, fixture_type: str, fixture_icon: str = "none", fixture_label: str = "Fixture", group: str = ""):
        self.DMX_addr = int(DMX_addr)
        self.fixture_num = int(fixture_num)
        self.icon = fixture_icon
        self.fixture_type = fixture_type
        self.fixture_label = fixture_label
        self.fixture_channels = {}
        self.gridPosX, self.gridPosY = gridPos
        self.grouped_to = group

        type_info = FIXTURE_TYPES.TYPES.get(self.fixture_type, {})
        self.fixture_channels = type_info.get("offsets", {})

    def __getattr__(self, name: str):
        return self.get_channel_addr(name)


    def get_channel_addr(self, attr_name: str):
        attr_key = attr_name.lower()
        if attr_key in self.fixture_channels:
            offset = int(self.fixture_channels[attr_key])
            return self.DMX_addr + offset
        raise AttributeError(f"Fixture {self.fixture_num} does not have \"{attr_key}\" attribute.")


    def set_num(self, number: int, feedback: bool = False):
        self.fixture_num = number

        if feedback:
            return self.fixture_num


    def get_num(self) -> int:
        return self.fixture_num


    def set_group(self, group: str, feedback: bool = False):
        self.grouped_to = group

        if feedback:
            return self.grouped_to


    def get_group(self) -> str:
        return self.grouped_to


    def to_string(self):
        """Returns a string that contains all data from this class"""
        return(
            f""" ----- Fixture Data -------
            Addr:  {self.DMX_addr};
            Chan:  {self.fixture_channels};
            Num:   {self.fixture_num};
            Label: {self.fixture_label};
            Group: {self.grouped_to};
            """)
    
    def to_dict(self) -> dict:
        """Returns Dictionary object (JSON) of this class"""
        return {
            "label":    self.fixture_label,
            "address":  self.DMX_addr,
            "icon":     self.icon,
            "number":   self.fixture_num,
            "type":     self.fixture_type,
            "group":    self.grouped_to,
            "x":        self.gridPosX,
            "y":        self.gridPosY
        }


class FixtureType:
    def __init__(self, fp="static/fixture_types.json"):
        current_path = os.path.dirname(os.path.abspath(__file__))
        
        with open(os.path.join(current_path, "..", fp), "r") as file:
            self.TYPES = json.load(file)

        self.NAMES = list(self.TYPES.keys())

FIXTURE_TYPES = FixtureType()


class FixtureMatrix:
    def __init__(self, data: dict, size: tuple[int, int]):
        self.cols, self.rows = size
        self.matrix = [[None for _ in range(self.cols)] for _ in range(self.rows)]

        self._populateMatrix(data.get("universe-1", []))


    def _populateMatrix(self, fixtures_list: list):
        for fix in fixtures_list:
            x, y = fix.get("x"), fix.get("y")
            if 0 <= x < self.cols and 0 <= y < self.rows:
                self.matrix[y][x] = Fixture(
                                        gridPos         = (x, y),       
                                        DMX_addr        = fix["address"],
                                        fixture_num     = fix["number"],
                                        fixture_icon    = fix["icon"],
                                        fixture_type    = fix["type"],
                                        fixture_label   = fix["label"],
                                        group           = fix["group"]
                                    )



    def find_fixture(self, x: int, y: int) -> Fixture:
        """Returns Fixture class if found. Returns None if not found."""
        if 0 <= x < self.cols and 0 <= y < self.rows:
            return self.matrix[y][x]


    def find_by_num(self, num: int) -> Fixture:
        """Finds fixture by its number"""
        for row in self.matrix:
            for fix in row:
                if fix and fix.fixture_num == num:
                    return fix
        return None


    def to_dict(self) -> dict:
        """Returns current matrix in Dict format."""

        _list_of_dicts = []
        for row in self.matrix:
            for fixture in row:
                if fixture is not None:
                    data = fixture.to_dict()
                    _list_of_dicts.append(data)

        return {
            "universe-1": _list_of_dicts
        }
    

    def save_to_file(self, fp: str):
        """
        Takes matrix data from self.to_dict() and saves them into a specified file.
        fp - file path
        """
        data = self.to_dict()

        with open(fp, "w", encoding="utf-8") as saving_file:
            json.dump(data, saving_file, indent=4)



    def get_fixture(self, x: int, y: int):
        """Returns fixture on given grid position X and Y. Returns None if not found"""
        return self.matrix[y][x]
    

    def set_fixture(self, x: int, y: int, fixture_data: dict):
        """Adds new fixture to grid and saves it into a file."""
        self.matrix[y][x] = Fixture(
                                gridPos         = (x, y),       
                                DMX_addr        = fixture_data["address"],
                                fixture_num     = fixture_data["number"],
                                fixture_icon    = fixture_data["icon"],  
                                fixture_type    = fixture_data["type"],
                                fixture_label   = fixture_data["label"],
                                group           = fixture_data["group"]
                            )
        
        if fixture_data["type"] == "group":
            for fix_data in fixture_data["selected_fixtures"]:
                fix = self.find_fixture(fix_data["x"], fix_data["y"])
                if fix:
                    fix.grouped_to = fixture_data["group"]


    def remove_fixture(self, x: int, y: int):
        """Removes fixture from grid on given position X and Y"""
        self.matrix[y][x] = None 


    def clear_matrix(self):
        """Completly wipe the whole matrix."""
        self.matrix = [[None for _ in range(self.cols)] for _ in range(self.rows)]
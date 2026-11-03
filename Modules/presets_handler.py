import json
import os
import uuid

def generate_preset_id() -> str:
    """Returns a new globally unique fixture ID."""
    return uuid.uuid4().hex

class PresetButton:
    def __init__(self, gridPos: tuple[int, int], preset_name: str, preset_icon=None, preset_id: str = None):
        self.id = str(preset_id) if preset_id else generate_preset_id()
        self.gridPosX, self.gridPosY = gridPos
        self.name = preset_name
        self.icon = preset_icon


    def to_dict(self) -> dict:
        return {
            "id":   self.id,
            "x":    self.gridPosX,
            "y":    self.gridPosY,
            "name": self.name,
            "icon": self.icon
        }

    @classmethod  
    def from_dict(self, data):
        return PresetButton(
            preset_id      = data.get("id"),
            preset_name    = data.get("name"),
            preset_icon    = data.get("icon"),
            gridPos = (data.get("x"), data.get("y"))
        )


class PresetMatrix:
    def __init__(self, data: dict, size: tuple[int, int]):
        self.rows, self.cols = size
        self.matrix = [[None for _ in range(self.cols)] for _ in range(self.rows)]
        self._populateMatrix(data)


    def _populateMatrix(self, presets_obj: dict):
        for preset in presets_obj.values():
            x, y = preset.get("x"), preset.get("y")
            if 0 <= x < self.cols and 0 <= y < self.rows:
                self.matrix[y][x] = PresetButton(
                                        preset_id   = preset.get("id"),
                                        gridPos     = (x, y),
                                        preset_name = preset.get("name"),
                                        preset_icon = preset.get("icon")
                                    )

    
    def find_by_id(self, preset_id: str) -> PresetButton:
        for row in self.matrix:
            for preset in row:
                if preset and preset.id == preset_id:
                    return preset
        return None


    def to_dict(self) -> dict:
        obj_from_matrix = {}
        for row in self.matrix:
            for preset in row:
                if preset is not None:
                    preset_obj = preset.to_dict()
                    obj_from_matrix.update({f"{preset.id}": preset_obj})
        
        return obj_from_matrix


    def save_to_file(self, fp: str):
        data = self.to_dict()
        with open(fp, "w", encoding="utf-8") as saving_file:
            json.dump(data, saving_file, indent=4)


    def get_preset(self, x: int, y: int):
        return self.matrix[y][x]

    
    def set_preset(self, x: int, y: int, preset: PresetButton):
        self.matrix[y][x] = preset


    def remove_preset(self, x: int, y: int):
        self.matrix[y][x] = None


    def clear_matrix(self):
        self.matrix = [[None for _ in range(self.cols)] for _ in range(self.rows)]





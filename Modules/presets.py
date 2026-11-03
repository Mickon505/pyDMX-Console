import time
import threading
import collections

class PresetStoppedException(Exception):
    pass

class Preset:

    dmx = None
    fixture_matrix = None
    master_level = 255
    preset_callbacks = {}
    
    _thread_local = threading.local()

    @classmethod
    def setup(cls, _dmx, _fixture_matrix):
        """Init function for references on main DMX bus and fixture matrix."""
        cls.dmx = _dmx
        cls.fixture_matrix = _fixture_matrix


    @classmethod
    def custom_sleep(cls, seconds):
        stop = getattr(cls._thread_local, "stop_event", None)
        if stop:
            if stop.is_set() or stop.wait(seconds):
                raise PresetStoppedException()

        else:
            time.sleep(seconds)


    @classmethod
    def set_fixture(cls, fix_id: str, attr_name: str, value: int, universe: int = 1):
        if not cls.fixture_matrix or not cls.dmx:
            return

        fix = cls.fixture_matrix.find_by_id(fix_id)
        if fix:
            dmx_addr = fix.get_channel_addr(attr_name)
            cls.dmx.set_channel(universe, dmx_addr, value)

    @classmethod
    def pressed(cls, preset_id: str):
        callback = cls.preset_callbacks.get(preset_id)

        if not callback:
            print(f"WARN: Callback for not found")
            return
        
        def run_callback():
            stop = threading.Event()
            Preset._thread_local.stop_event = stop

            try:
                callback()
                
            except PresetStoppedException:
                print("WARN: PresetStoppedException raised")

            except Exception as e:
                print(f"Error in preset callback {preset_id}: {e}")

            finally:
                if hasattr(Preset._thread_local, "stop_event"):
                    delattr(Preset._thread_local, "stop_event")

        thread = threading.Thread(target=run_callback, daemon=True)
        thread.start()
        print(f"INFO: Preset {preset_id} executed")


    @classmethod
    def raise_stop():
        raise PresetStoppedException

    
    @classmethod
    def register_preset_callback(cls, callback):
        _id = str(callback.__name__).split("_")[1]
        cls.preset_callbacks[str(_id)] = callback
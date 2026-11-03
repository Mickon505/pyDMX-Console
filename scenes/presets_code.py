from Modules.presets import Preset
sleep = Preset.custom_sleep

def _1033a93a5ee4457ca8db29de8aff1811_pressed(sleep=Preset.custom_sleep):
  Preset.set_fixture("bd68704f010743268c8fa5c5d9331ddc", "dimmer", 255)
  Preset.set_fixture("bd68704f010743268c8fa5c5d9331ddc", "r", 255)

Preset.register_preset_callback(_1033a93a5ee4457ca8db29de8aff1811_pressed)

from Modules.scene_code import Scene
sleep = Scene.custom_sleep

i = None


def on_fader_1(fader_value, sleep=Scene.custom_sleep):
  Scene.set_fixture(1, "dimmer", 255)
  Scene.set_fixture(1, "shutter", 255)
  for i in range(256):
    Scene.set_fixture(1, "r", i)
    sleep(0.01)
  sleep(0.5)
  for i in range(255, -1, -1):
    Scene.set_fixture(1, "r", i)
    sleep(0.01)

Scene.register_fader_callback(1, on_fader_1)

def on_fader_2(fader_value, sleep=Scene.custom_sleep):
  for i in range(256):
    Scene.set_fixture(1, "g", i)
    sleep(0.01)
  sleep(0.5)
  for i in range(255, -1, -1):
    Scene.set_fixture(1, "g", i)
    sleep(0.01)

Scene.register_fader_callback(2, on_fader_2)

def on_fader_3(fader_value, sleep=Scene.custom_sleep):
  for i in range(256):
    Scene.set_fixture(1, "b", i)
    sleep(0.01)
  sleep(0.5)
  for i in range(255, -1, -1):
    Scene.set_fixture(1, "b", i)
    sleep(0.01)

Scene.register_fader_callback(3, on_fader_3)

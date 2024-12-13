# Homebridge Plugin for Keepsmile LED

Install: `npm install https://github.com/OK-Penalty-218/homebridge-keepsmile-ble`

Currently in beta testing as I'm developing this based on a fork from @sorae42's homebridge-mohuan-ble plugin. It seems in my research that the Tenmiro lights which use the Keepsmile app have a different data flow. I'm coding almost entirely from ChatGPT and learning as I go so any help would be apreciated.

I have also been implementing code from @jtafts webbrowser based controller for lights controlled by the keepsmile app.

Something else of note is that I am trying to find a way to code automatic discovery of the bluetooth light strips in the same way that the Keepsmile app connects to the lights so that you do not need a bluetooth intercepter app to find the UUID of your lights.

Please note that the color shown on the Home.app will not always accurate to the LED strip. Blame your Chinese manufacturer for that. (or send an PR if you figured out the accuracy!)


## How do I know my LED strip is compatible?

If your LED strips use the Keepsmile app to control, it should be compatible. Although as of now I am unable to make the code work to do automatic discovery and inputing the UUID directly into the plugin is also not working.


##Reddit thread documenting my journey with this plugin

[ISO a Tenmiro or Keepsmile plugin for LED Light Strips](https://www.reddit.com/r/homebridge/comments/1haib6n/iso_a_tenmiro_or_keepsmile_plugin_for_led_light/)


##Credits to @Sorae42 & @jtaft

[Sorae42's Github](https://github.com/sorae42)
[Sorae42's Homebridge MohuanLED BLE Plug-in](https://github.com/sorae42/homebridge-mohuan-ble)
[jtaft's Github](https://github.com/jtaft)
[jtaft's Bluetooth Keepsmile Lights Web-Based Controller](https://github.com/jtaft/bluetooth-keepsmile-lights)

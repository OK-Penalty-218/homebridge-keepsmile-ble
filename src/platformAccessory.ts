import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ExampleHomebridgePlatform } from './platform.js';
import noble, { Peripheral, Characteristic } from '@abandonware/noble';
import { hsvToRgb } from './util.js';

// This class defines the accessory (in your case, a Bluetooth LED light)
export class ExamplePlatformAccessory {
  private lightbulbService: Service;
  private currentState: boolean = false;
  private states = {
    On: false,
    Brightness: 100,
    Hue: 0,
    Saturation: 0,
  };

  private peripheral?: Peripheral;
  private characteristic?: Characteristic;
  private connected: boolean = false;
  private disconnectTimer?: NodeJS.Timeout;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory
  ) {
    this.accessory.displayName = accessory.context.device.name;

    // Get or create the Lightbulb service
    this.lightbulbService = this.accessory.getService(Service.Lightbulb)
      || this.accessory.addService(Service.Lightbulb);

    // Register the "On" characteristic
    this.lightbulbService.getCharacteristic(Characteristic.On)
      .on('get', this.getOnState.bind(this))
      .on('set', this.setOnState.bind(this));

    // Register the "Brightness", "Hue", and "Saturation" characteristics
    this.lightbulbService.getCharacteristic(Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this));

    this.lightbulbService.getCharacteristic(Characteristic.Hue)
      .on('set', this.setHue.bind(this));

    this.lightbulbService.getCharacteristic(Characteristic.Saturation)
      .on('set', this.setSaturation.bind(this));

    // Identify the accessory (for Home app)
    this.accessory.on('identify', this.identify.bind(this));
  }

  private getOnState(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Getting current state of the light: ', this.states.On ? 'ON' : 'OFF');
    callback(null, this.states.On);
  }

  private async setOnState(value: boolean, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Setting light state to: ', value ? 'ON' : 'OFF');
    this.states.On = value;
    await this.sendCommandToDevice(value ? '5BF000B5' : '5B0F00B5');  // Use correct on/off command
    callback();
  }

  private async setBrightness(value: CharacteristicValue) {
    this.states.Brightness = value as number;
    await this.setRGB();
    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

  private async setHue(value: CharacteristicValue) {
    this.states.Hue = value as number;
    await this.setRGB();
    this.platform.log.debug('Set Characteristic Hue -> ', value);
  }

  private async setSaturation(value: CharacteristicValue) {
    this.states.Saturation = value as number;
    await this.setRGB();
    this.platform.log.debug('Set Characteristic Saturation -> ', value);
  }

  private async setRGB() {
    if (!this.characteristic) return;

    const rgb = hsvToRgb(this.states.Hue, this.states.Saturation, this.states.Brightness);
    const r = ('0' + rgb[0]?.toString(16)).slice(-2);
    const g = ('0' + rgb[1]?.toString(16)).slice(-2);
    const b = ('0' + rgb[2]?.toString(16)).slice(-2);
    const brightness = ('0' + Math.round((this.states.Brightness / 100) * 255).toString(16)).slice(-2);

    const data = Buffer.from(`69960502${r}${g}${b}${brightness}`, 'hex');
    await this.sendCommandToDevice(data);
  }

  private async sendCommandToDevice(command: string | Buffer) {
    if (!this.characteristic) return;
    await this.characteristic.write(command, true, (err) => {
      if (err) {
        this.platform.log.error('Error writing to device:', err);
      }
      this.debounceDisconnect();
    });
  }

  private debounceDisconnect() {
    clearTimeout(this.disconnectTimer);
    this.disconnectTimer = setTimeout(async () => {
      if (this.peripheral && this.connected) {
        await this.peripheral.disconnectAsync();
        this.connected = false;
        this.platform.log.debug('Disconnected from device.');
      }
    }, 10000);  // Wait 10 seconds before disconnecting

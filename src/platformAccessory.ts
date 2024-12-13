const noble = require('@abandonware/noble'); // For BLE communication with LED device
const { Accessory, Service, Characteristic } = require('homebridge');

const SERVICE_UUID = '0000afd0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_WRITE_UUID = '0000afd1-0000-1000-8000-00805f9b34fb';
const LIGHTS_ON_STRING = "5BF000B5";
const LIGHTS_OFF_STRING = "5B0F00B5";
const CHARACTERISTIC_READ_UUID = "0000afd3-0000-1000-8000-00805f9b34fb";

module.exports = (homebridge) => {
  homebridge.registerAccessory('homebridge-led-light', 'LedLight', LedLightAccessory);
};

class LedLightAccessory {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.name = config.name || 'LED Light';

    this.powerState = false; // Light is off initially
    this.brightness = 100;  // Default brightness

    this.characteristicWriteUUID = CHARACTERISTIC_WRITE_UUID;
    this.service = new Service.Lightbulb(this.name);

    // Register the "On" characteristic (turn on/off)
    this.service.getCharacteristic(Characteristic.On)
      .on('set', this.setPowerState.bind(this));

    // Register the "Brightness" characteristic
    this.service.getCharacteristic(Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this));

    // Register the "Color" characteristic (color change, e.g., RGB)
    this.service.addCharacteristic(new Characteristic.Hue())
      .on('set', this.setColor.bind(this));

    this.device = null;
    this.connectDevice();
  }

  async connectDevice() {
    noble.on('stateChange', async (state) => {
      if (state === 'poweredOn') {
        noble.startScanning([], false);
      }
    });

    noble.on('discover', (peripheral) => {
      if (peripheral.advertisement.localName && peripheral.advertisement.localName.includes('KS03')) {
        this.log('Found LED device:', peripheral.advertisement.localName);
        this.device = peripheral;
        noble.stopScanning();
        this.connectToDevice();
      }
    });
  }

  async connectToDevice() {
    try {
      await this.device.connect();
      const service = await this.device.discoverSomeServices([SERVICE_UUID]);
      this.characteristic = await service[0].discoverCharacteristics([CHARACTERISTIC_WRITE_UUID]);
    } catch (error) {
      this.log('Error connecting to BLE device:', error);
    }
  }

  async sendCommand(command) {
    if (this.device && this.characteristic) {
      const byteCommand = new Uint8Array(Buffer.from(command, 'hex'));
      await this.characteristic[0].write(byteCommand, true);
      this.log(`Sent command: ${command}`);
    }
  }

  setPowerState(value, callback) {
    this.powerState = value;
    const command = this.powerState ? LIGHTS_ON_STRING : LIGHTS_OFF_STRING;
    this.sendCommand(command)
      .then(() => callback())
      .catch((err) => {
        this.log('Error setting power state:', err);
        callback(err);
      });
  }

  setBrightness(value, callback) {
    this.brightness = value;
    const command = this.getColorCommand(255, 255, 255, this.brightness);
    this.sendCommand(command)
      .then(() => callback())
      .catch((err) => {
        this.log('Error setting brightness:', err);
        callback(err);
      });
  }

  setColor(value, callback) {
    // This is where you would handle RGB or hue adjustments
    const command = this.getColorCommand(255, 0, 0, this.brightness); // Example: Red color
    this.sendCommand(command)
      .then(() => callback())
      .catch((err) => {
        this.log('Error setting color:', err);
        callback(err);
      });
  }

  getColorCommand(red, green, blue, brightness) {
    return `5A0001${this.toHex(red)}${this.toHex(green)}${this.toHex(blue)}00${this.toHex(brightness)}00A5`;
  }

  toHex(value) {
    return value.toString(16).padStart(2, '0').toUpperCase();
  }

  getServices() {
    return [this.service];
  }
}

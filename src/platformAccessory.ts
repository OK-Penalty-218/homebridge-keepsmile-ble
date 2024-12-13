import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { ExampleHomebridgePlatform } from './platform.js';
import noble, { Characteristic, Peripheral } from '@abandonware/noble';
import { hsvToRgb } from './util.js';
import { PlatformAccessory, Service, Characteristic } from 'homebridge';
import { ExampleHomebridgePlatform } from './platform';  // Import your platform class

// This class defines the accessory (in your case, a Bluetooth LED light)
export class ExamplePlatformAccessory {
  private lightbulbService: Service;
  private currentState: boolean = false;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory
  ) {
    this.accessory.displayName = accessory.context.device.name;

    this.lightbulbService = this.accessory.getService(Service.Lightbulb)
      || this.accessory.addService(Service.Lightbulb);

    this.lightbulbService.getCharacteristic(Characteristic.On)
      .on('get', this.getOnState.bind(this))
      .on('set', this.setOnState.bind(this));

    this.accessory.on('identify', this.identify.bind(this));
  }

  private getOnState(callback: CharacteristicGetCallback) {
    this.platform.log.debug('Getting current state of the light: ', this.currentState ? 'ON' : 'OFF');
    callback(null, this.currentState); // return the current state (on/off)
  }

  private async setOnState(value: boolean, callback: CharacteristicSetCallback) {
    this.platform.log.debug('Setting light state to: ', value ? 'ON' : 'OFF');
    this.currentState = value;
    // Your code to interact with Bluetooth LED goes here...
    callback();
  }

  private identify(callback: () => void) {
    this.platform.log.info('Identifying light: ', this.accessory.displayName);
    callback();
  }
}
  private states = {
    // state
    On: false,
    Brightness: 100,

    // colors!
    Hue: 0,
    Saturation: 0,
  };

  private peripheral?: Peripheral;
  private characteristic?: Characteristic;
  private connected?: boolean = false;

  private disconnectTimer?: NodeJS.Timeout;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Welpur, Kimoji LLC.',
      )
      .setCharacteristic(this.platform.Characteristic.Model, '5050RGBLED')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        'CNLEDNOSERIALLOL',
      );

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.name,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this));

noble.on('stateChange', async (state) => {
  if (state === 'poweredOn') {
    await noble.startScanningAsync([], false);  // Ensure it's scanning for all devices
  }
});

    noble.on('discover', async (peripheral) => {
      if (peripheral.uuid === accessory.context.device.uuid) {
        await noble.stopScanningAsync();
        this.peripheral = peripheral;
        peripheral.disconnectAsync();
      }
    });
  }

  async connectAndGetWriteCharacteristics() {
    if (!this.peripheral) {
      await noble.startScanningAsync();
      return;
    }
    await this.peripheral.connectAsync();
    this.connected = true;
    const { characteristics } =
      await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(
        ['EEA0'],
        ['EE01'],
      );
    this.characteristic = characteristics[0];
    this.platform.log.debug('GetWriteCharacteristics OK!');
  }

  async debounceDisconnect() {
    clearTimeout(this.disconnectTimer);
    this.disconnectTimer = setTimeout(async () => {
      if (this.peripheral && this.connected) {
        await this.peripheral.disconnectAsync();
        this.connected = false;
        this.platform.log.debug('Disconnected.');
      }
    }, 10000);
  }

async setOn(value: CharacteristicValue) {
  if (!this.connected) {
    await this.connectAndGetWriteCharacteristics();
  }
  if (!this.characteristic) {
    return;
  }

  if (this.states.On !== value) {
    // Use your actual ON/OFF command strings here
    const data = Buffer.from(
      value ? '5BF000B5' : '5B0F00B5',  // Use your specific on/off commands
      'hex',
    );
    this.characteristic?.write(data, true, (e) => {
      if (e) {
        this.platform.log.error(e);
      }
      this.states.On = value as boolean;
      this.debounceDisconnect();
    });
  }

  this.platform.log.debug('Set Characteristic On ->', value);
}

async setRGB() {
  if (!this.characteristic) {
    return;
  }
  const rgb = hsvToRgb(
    this.states.Hue,
    this.states.Saturation,
    this.states.Brightness,
  );

  const r = ('0' + rgb[0]?.toString(16)).slice(-2);
  const g = ('0' + rgb[1]?.toString(16)).slice(-2);
  const b = ('0' + rgb[2]?.toString(16)).slice(-2);
  const brightness = (
    '0' + Math.round((this.states.Brightness / 100) * 255).toString(16)
  ).slice(-2);

  // Use the proper command format for RGB control
  const data = Buffer.from(`69960502${r}${g}${b}${brightness}`, 'hex');

  this.characteristic?.write(data, true, (e) => {
    if (e) {
      this.platform.log.error(e);
    }
    this.debounceDisconnect();
  });
}

  // TODO: Check bluetooth status and report it here
  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.states.On;
    if (!this.characteristic) {
      await this.connectAndGetWriteCharacteristics();
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    } else {
      this.platform.log.debug('Get Characteristic On ->', isOn);
      this.debounceDisconnect();
      return isOn;
    }
  }

  async setBrightness(value: CharacteristicValue) {
    if (!this.connected) {
      await this.connectAndGetWriteCharacteristics();
    }
    this.states.Brightness = value as number;
    this.setRGB();
    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

  async setHue(value: CharacteristicValue) {
    if (!this.connected) {
      await this.connectAndGetWriteCharacteristics();
    }
    this.states.Hue = value as number;
    this.setRGB();
    this.platform.log.debug('Set Characteristic Hue -> ', value);
  }

  async setSaturation(value: CharacteristicValue) {
    if (!this.connected) {
      await this.connectAndGetWriteCharacteristics();
    }
    this.states.Saturation = value as number;
    this.setRGB();
    this.platform.log.debug('Set Characteristic Saturation -> ', value);
  }

  async setRGB() {
    if (!this.characteristic) {
      return;
    }
    const rgb = hsvToRgb(
      this.states.Hue,
      this.states.Saturation,
      this.states.Brightness,
    );

    const r = ('0' + rgb[0]?.toString(16)).slice(-2);
    const g = ('0' + rgb[1]?.toString(16)).slice(-2);
    const b = ('0' + rgb[2]?.toString(16)).slice(-2);
    const brightness = (
      '0' + Math.round((this.states.Brightness / 100) * 255).toString(16)
    ).slice(-2);

    const data = Buffer.from(`69960502${r}${g}${b}${brightness}`, 'hex');

    this.characteristic?.write(data, true, (e) => {
      if (e) {
        this.platform.log.error(e);
      }
      this.debounceDisconnect();
    });
  }
}

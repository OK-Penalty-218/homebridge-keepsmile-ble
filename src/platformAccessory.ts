// Use single quotes for strings
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ExampleHomebridgePlatform } from './platform.js';
import noble, { Characteristic, Peripheral } from '@abandonware/noble';
import { hsvToRgb } from './util.js';

// Remove trailing spaces
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
    callback();
  }

  private identify(callback: () => void) {
    this.platform.log.info('Identifying light: ', this.accessory.displayName);
    callback();
  }
}

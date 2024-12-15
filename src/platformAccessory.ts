import { Service, PlatformAccessory, Characteristic } from 'homebridge'; // Import types from homebridge
import { ExampleHomebridgePlatform } from './platform.js';

export class ExamplePlatformAccessory {
  private lightbulbService: Service;
  private currentState: boolean = false;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory
  ) {
    this.accessory.displayName = accessory.context.device.name;

    // Use Service and Characteristic from API.hap
    this.lightbulbService = this.accessory.getService(Service.Lightbulb)
      || this.accessory.addService(Service.Lightbulb);

    // Make sure Characteristic.On is used correctly
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

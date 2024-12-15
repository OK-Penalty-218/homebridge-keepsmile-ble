import { Service, Characteristic, CharacteristicGetCallback, CharacteristicSetCallback, PlatformAccessory } from 'homebridge';  // Correct imports
import { ExampleHomebridgePlatform } from './platform';  // Correct import for the platform class

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
    // Log the current state of the light (on/off)
    this.platform.log.debug('Getting current state of the light: ', this.currentState ? 'ON' : 'OFF');
    callback(null, this.currentState); // Return the current state (on/off)
  }

  private async setOnState(value: boolean, callback: CharacteristicSetCallback) {
    // Log when setting the light state
    this.platform.log.debug('Setting light state to: ', value ? 'ON' : 'OFF');
    this.currentState = value;
    callback();  // Callback to finish the action
  }

  private identify(callback: () => void) {
    // Log when identifying the accessory
    this.platform.log.info('Identifying light: ', this.accessory.displayName);
    callback();  // Identify callback
  }
}

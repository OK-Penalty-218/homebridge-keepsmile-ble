import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';
import noble from '@abandonware/noble';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ExamplePlatformAccessory } from './platformAccessory.js';

const SERVICE_UUID = "0000afd0-0000-1000-8000-00805f9b34fb";  // LED light strip service UUID
const CHARACTERISTIC_READ_UUID = "0000afd3-0000-1000-8000-00805f9b34fb"; // Read characteristic
const CHARACTERISTIC_WRITE_UUID = "0000afd1-0000-1000-8000-00805f9b34fb"; // Write characteristic
const CHARACTERISTIC_NOTIFY_UUID = "0000afd2-0000-1000-8000-00805f9b34fb"; // Notify characteristic

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  private connected: boolean = false;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    noble.on('stateChange', async (state) => {
      if (state === 'poweredOn') {
        await noble.startScanningAsync([], false);
        this.log.info('Started scanning for Bluetooth devices...');
      }
    });

    noble.on('discover', async (peripheral) => {
      this.log.debug(`Discovered peripheral: ${peripheral.advertisement.localName} UUID: ${peripheral.uuid}`);
      this.log.debug('Advertisement:', peripheral.advertisement);

      // Check if the peripheral matches the UUID from config
      if (peripheral.uuid === this.config['bluetoothuuid']) {
        await noble.stopScanningAsync();
        this.log.success(`Found target device: ${peripheral.advertisement.localName} with UUID: ${peripheral.uuid}`);

        const uuid = this.api.hap.uuid.generate(peripheral.advertisement.localName || 'MOHUANLED404');
        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          new ExamplePlatformAccessory(this, existingAccessory);
        } else {
          this.log.info('Setting up new accessory:', peripheral.advertisement.localName);
          const accessory = new this.api.platformAccessory(peripheral.advertisement.localName || 'Light Strip', uuid);

          accessory.context.device = {
            hkid: uuid,
            uuid: peripheral.uuid,
            name: peripheral.advertisement.localName,
          };

          new ExamplePlatformAccessory(this, accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

          this.log.debug('Accessory registration successful!');
        }

        this.connected = true;
        await peripheral.disconnectAsync();
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
        [SERVICE_UUID], // Use the defined service UUID
        [CHARACTERISTIC_READ_UUID, CHARACTERISTIC_WRITE_UUID, CHARACTERISTIC_NOTIFY_UUID] // Characteristics for read, write, and notify
      );
      
    this.characteristic = characteristics.find(
      (characteristic) => characteristic.uuid === CHARACTERISTIC_WRITE_UUID
    );

    if (!this.characteristic) {
      this.platform.log.error('Could not find the write characteristic!');
      return;
    }

    this.platform.log.debug('GetWriteCharacteristics OK!');
  }
}
